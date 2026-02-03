/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createProxyServer } from 'http-proxy';
import type { IncomingMessage, ServerResponse } from 'http';
import type { IRouter } from '@kbn/core-http-server';
import type { InternalStaticAssets } from '@kbn/core-http-server-internal';
import { schema } from '@kbn/config-schema';

// Vite config interface
// Config is stored in global.__kbnViteConfig by bootstrap.ts when IPC message is received
export interface LocalViteConfig {
  serverUrl: string;
  pluginIds: string[];
}

// These are kept for backwards compatibility but now read from global
export function setViteConfig(config: LocalViteConfig): void {
  // eslint-disable-next-line no-console
  console.log(
    `[vite-proxy] Config set: ${config.pluginIds.length} plugins from ${config.serverUrl}`
  );
  (global as any).__kbnViteConfig = config;
}

export function getViteConfig(): LocalViteConfig | null {
  return (global as any).__kbnViteConfig || null;
}

export interface ViteProxyConfig {
  /**
   * The Vite dev server URL
   */
  viteServerUrl: string;

  /**
   * Plugin IDs that should be proxied to Vite
   */
  pluginIds: string[];

  /**
   * Whether the Vite server is ready
   */
  isReady: () => boolean;

  /**
   * Static assets service for path resolution
   */
  staticAssets: InternalStaticAssets;
}

/**
 * Configuration for dynamic Vite proxy (uses ViteConfigService)
 */
export interface DynamicViteProxyConfig {
  /**
   * Static assets service for path resolution
   */
  staticAssets: InternalStaticAssets;
}

/**
 * Create a proxy middleware that forwards plugin bundle requests to Vite
 */
export function createViteProxyMiddleware(config: ViteProxyConfig) {
  const { viteServerUrl, pluginIds, isReady } = config;
  const pluginIdSet = new Set(pluginIds);

  const proxy = createProxyServer({
    target: viteServerUrl,
    changeOrigin: true,
    ws: true, // Enable websocket proxying for HMR
  });

  // Handle proxy errors gracefully
  proxy.on('error', (err, req, res) => {
    console.error('[vite-proxy] Proxy error:', err.message);
    if (res && 'writeHead' in res) {
      (res as ServerResponse).writeHead(502, { 'Content-Type': 'text/plain' });
      (res as ServerResponse).end('Vite dev server unavailable');
    }
  });

  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url || '';

    // Check if this is a plugin bundle request that should go to Vite
    const pluginMatch = url.match(/^\/bundles\/plugin\/([^/]+)\//);
    if (pluginMatch) {
      const pluginId = pluginMatch[1];
      if (pluginIdSet.has(pluginId)) {
        if (!isReady()) {
          res.writeHead(503, { 'Content-Type': 'text/plain' });
          res.end('Vite dev server not ready');
          return;
        }

        // Forward to Vite
        proxy.web(req, res);
        return;
      }
    }

    // Check for HMR-related requests
    if (url.startsWith('/@vite/') || url.startsWith('/@id/') || url.startsWith('/@fs/')) {
      if (!isReady()) {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end('Vite dev server not ready');
        return;
      }

      proxy.web(req, res);
      return;
    }

    // Not a Vite request, continue to next handler
    next();
  };
}

/**
 * Create a WebSocket upgrade handler for HMR
 */
export function createViteWsProxy(config: ViteProxyConfig) {
  const { viteServerUrl } = config;

  const proxy = createProxyServer({
    target: viteServerUrl,
    ws: true,
  });

  proxy.on('error', (err) => {
    console.error('[vite-proxy] WebSocket proxy error:', err.message);
  });

  return (req: IncomingMessage, socket: any, head: Buffer) => {
    proxy.ws(req, socket, head);
  };
}

/**
 * Register Vite proxy routes on the Kibana router
 *
 * This creates routes that proxy plugin bundle requests to the Vite dev server.
 */
export function registerViteProxyRoutes(router: IRouter, config: ViteProxyConfig) {
  const { viteServerUrl, pluginIds, isReady, staticAssets } = config;

  // Register a catch-all route for plugin bundles that should go to Vite
  for (const pluginId of pluginIds) {
    // Use staticAssets.prependServerPath to get the route with the hash prefix
    const pluginBundlesPath = `/bundles/plugin/${pluginId}/`;
    const routePath = staticAssets.prependServerPath(pluginBundlesPath);

    router.get(
      {
        path: `${routePath}{version}/{path*}`,
        options: {
          httpResource: true,
          authRequired: false,
          access: 'public',
          excludeFromRateLimiter: true,
        },
        validate: {
          params: schema.object({
            version: schema.string(),
            path: schema.string(),
          }),
        },
        security: {
          authz: {
            enabled: false,
            reason: 'This route proxies to Vite dev server for development.',
          },
        },
      },
      async (context, request, response) => {
        if (!isReady()) {
          return response.customError({
            statusCode: 503,
            body: 'Vite dev server not ready',
          });
        }

        // Extract the path after the hash prefix and proxy to Vite
        // The request comes in as /{hash}/bundles/plugin/{id}/{version}/{file}
        // We need to proxy to Vite as /bundles/plugin/{id}/{file}
        const { version, path: filePath } = request.params;
        const viteUrl = `${viteServerUrl}/bundles/plugin/${pluginId}/${version}/${filePath}`;

        try {
          const proxyResponse = await fetch(viteUrl, {
            headers: {
              ...Object.fromEntries(
                Object.entries(request.headers).filter(
                  ([key]) => !['host', 'connection'].includes(key.toLowerCase())
                )
              ),
            } as Record<string, string>,
          });

          if (!proxyResponse.ok) {
            return response.customError({
              statusCode: proxyResponse.status,
              body: `Vite returned ${proxyResponse.status}: ${await proxyResponse.text()}`,
            });
          }

          const body = await proxyResponse.text();
          const contentType = proxyResponse.headers.get('content-type') || 'application/javascript';

          return response.ok({
            body,
            headers: {
              'content-type': contentType,
              // Don't cache in dev mode
              'cache-control': 'no-cache, no-store, must-revalidate',
            },
          });
        } catch (error) {
          return response.customError({
            statusCode: 502,
            body: `Failed to proxy to Vite: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          });
        }
      }
    );
  }

  // Register route for Vite client scripts
  router.get(
    {
      path: '/@vite/{path*}',
      options: {
        httpResource: true,
        authRequired: false,
        access: 'public',
        excludeFromRateLimiter: true,
      },
      validate: {
        params: schema.object({
          path: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route serves Vite HMR client scripts.',
        },
      },
    },
    async (context, request, response) => {
      if (!isReady()) {
        return response.customError({
          statusCode: 503,
          body: 'Vite dev server not ready',
        });
      }

      const viteUrl = `${viteServerUrl}${request.url.pathname}`;

      try {
        const proxyResponse = await fetch(viteUrl);
        const body = await proxyResponse.text();
        const contentType = proxyResponse.headers.get('content-type') || 'application/javascript';

        return response.ok({
          body,
          headers: {
            'content-type': contentType,
            'cache-control': 'no-cache',
          },
        });
      } catch (error) {
        return response.customError({
          statusCode: 502,
          body: `Failed to fetch Vite client: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        });
      }
    }
  );

  // Register route for static assets from source directories (x-pack/, src/, packages/)
  // These are assets like SVG, PNG, etc. imported in plugin source code
  const sourcePathPrefixes = ['x-pack', 'src', 'packages'];
  for (const prefix of sourcePathPrefixes) {
    router.get(
      {
        path: `/${prefix}/{path*}`,
        options: {
          httpResource: true,
          authRequired: false,
          access: 'public',
          excludeFromRateLimiter: true,
        },
        validate: {
          params: schema.object({
            path: schema.string(),
          }),
        },
        security: {
          authz: {
            enabled: false,
            reason: 'This route proxies static assets to Vite dev server.',
          },
        },
      },
      async (context, request, response) => {
        if (!isReady()) {
          return response.customError({
            statusCode: 503,
            body: 'Vite dev server not ready',
          });
        }

        const assetPath = request.url.pathname;

        // Only proxy known static asset types
        const assetExtensions = [
          '.svg',
          '.png',
          '.jpg',
          '.jpeg',
          '.gif',
          '.webp',
          '.ico',
          '.woff',
          '.woff2',
          '.ttf',
          '.eot',
        ];
        const hasAssetExtension = assetExtensions.some((ext) =>
          assetPath.toLowerCase().endsWith(ext)
        );
        if (!hasAssetExtension) {
          return response.notFound({ body: 'Not a static asset' });
        }

        const viteUrl = `${viteServerUrl}${assetPath}`;

        try {
          const proxyResponse = await fetch(viteUrl);

          if (!proxyResponse.ok) {
            return response.customError({
              statusCode: proxyResponse.status,
              body: `Vite returned ${proxyResponse.status}`,
            });
          }

          const body = Buffer.from(await proxyResponse.arrayBuffer());
          const contentType =
            proxyResponse.headers.get('content-type') || 'application/octet-stream';

          return response.ok({
            body,
            headers: {
              'content-type': contentType,
              'cache-control': 'no-cache',
            },
          });
        } catch (error) {
          return response.customError({
            statusCode: 502,
            body: `Failed to proxy asset to Vite: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          });
        }
      }
    );
  }
}

// Debug flag - set to true to enable verbose logging
const DEBUG_VITE_PROXY = process.env.DEBUG_VITE_PROXY === 'true';

/**
 * Create a dynamic request handler that checks ViteConfigService at request time.
 *
 * This handler can be used to try proxying to Vite first, and if the plugin
 * isn't served by Vite or Vite returns 404, it returns null to allow fallback
 * to disk-based bundles.
 *
 * @param pluginId The plugin ID to check
 * @returns Response if handled by Vite, null if should fall back to disk
 */
export async function tryViteProxy(
  pluginId: string,
  version: string,
  filePath: string
): Promise<{ body: string; contentType: string } | null> {
  const viteConfig = getViteConfig();

  // No Vite config yet, fall back to disk
  if (!viteConfig) {
    if (DEBUG_VITE_PROXY) {
      // eslint-disable-next-line no-console
      console.log(`[vite-proxy] No Vite config available for ${pluginId}, using disk`);
    }
    return null;
  }

  // Plugin not served by Vite, fall back to disk
  if (!viteConfig.pluginIds.includes(pluginId)) {
    if (DEBUG_VITE_PROXY) {
      // eslint-disable-next-line no-console
      console.log(`[vite-proxy] Plugin ${pluginId} not in Vite list, using disk`);
    }
    return null;
  }

  // Try to proxy to Vite - Vite serves ESM modules directly
  const viteUrl = `${viteConfig.serverUrl}/bundles/plugin/${pluginId}/${version}/${filePath}`;

  if (DEBUG_VITE_PROXY) {
    // eslint-disable-next-line no-console
    console.log(`[vite-proxy] Proxying ${pluginId}/${filePath} to ${viteUrl}`);
  }

  try {
    const proxyResponse = await fetch(viteUrl, {
      headers: {
        Accept: 'application/javascript, */*',
      },
    });

    if (!proxyResponse.ok) {
      if (DEBUG_VITE_PROXY) {
        // eslint-disable-next-line no-console
        console.log(
          `[vite-proxy] Vite returned ${proxyResponse.status} for ${pluginId}, using disk`
        );
      }
      // Vite returned error, fall back to disk
      return null;
    }

    const body = await proxyResponse.text();
    // Always return as JavaScript module
    const contentType = 'application/javascript; charset=utf-8';

    if (DEBUG_VITE_PROXY) {
      // eslint-disable-next-line no-console
      console.log(
        `[vite-proxy] Successfully proxied ${pluginId}/${filePath} (${body.length} bytes)`
      );
    }

    return { body, contentType };
  } catch (error) {
    if (DEBUG_VITE_PROXY) {
      // eslint-disable-next-line no-console
      console.log(`[vite-proxy] Error proxying ${pluginId}: ${error}`);
    }
    // Vite unavailable, fall back to disk
    return null;
  }
}

/**
 * Try to proxy a static asset request to Vite.
 * This handles assets like SVG, PNG, etc. that are imported in plugin source code.
 *
 * @param assetPath The filesystem-style path (e.g., /x-pack/plugins/foo/public/icon.svg)
 * @returns Response if handled by Vite, null if should fall back
 */
export async function tryViteAssetProxy(
  assetPath: string
): Promise<{ body: Buffer; contentType: string } | null> {
  const viteConfig = getViteConfig();

  // No Vite config, can't proxy
  if (!viteConfig) {
    // eslint-disable-next-line no-console
    console.log(`[vite-asset-proxy] No Vite config available, cannot proxy ${assetPath}`);
    return null;
  }

  // Only proxy known static asset types
  const assetExtensions = [
    '.svg',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
  ];
  const hasAssetExtension = assetExtensions.some((ext) => assetPath.toLowerCase().endsWith(ext));
  if (!hasAssetExtension) {
    return null;
  }

  // Proxy to Vite - Vite serves static files from repo root
  const viteUrl = `${viteConfig.serverUrl}${assetPath}`;

  if (DEBUG_VITE_PROXY) {
    // eslint-disable-next-line no-console
    console.log(`[vite-proxy] Proxying asset ${assetPath} to ${viteUrl}`);
  }

  try {
    const proxyResponse = await fetch(viteUrl);

    if (!proxyResponse.ok) {
      if (DEBUG_VITE_PROXY) {
        // eslint-disable-next-line no-console
        console.log(`[vite-proxy] Vite returned ${proxyResponse.status} for asset ${assetPath}`);
      }
      return null;
    }

    const body = Buffer.from(await proxyResponse.arrayBuffer());
    const contentType = proxyResponse.headers.get('content-type') || 'application/octet-stream';

    if (DEBUG_VITE_PROXY) {
      // eslint-disable-next-line no-console
      console.log(`[vite-proxy] Successfully proxied asset ${assetPath} (${body.length} bytes)`);
    }

    return { body, contentType };
  } catch (error) {
    if (DEBUG_VITE_PROXY) {
      // eslint-disable-next-line no-console
      console.log(`[vite-proxy] Error proxying asset ${assetPath}: ${error}`);
    }
    return null;
  }
}

/**
 * Check if Vite is configured and ready
 */
export function isViteEnabled(): boolean {
  return getViteConfig() !== null;
}

/**
 * Get the Vite server URL if configured
 */
export function getViteServerUrl(): string | null {
  const config = getViteConfig();
  return config?.serverUrl ?? null;
}
