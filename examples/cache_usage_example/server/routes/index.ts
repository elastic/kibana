import { AuthzDisabled } from '@kbn/core-security-server';
import type { CacheSetupContract } from '@kbn/core-cache-server';
import type { IRouter } from '@kbn/core/server';

function cns(key: string) {
  return `cache-usage-example:${key}`;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function defineRoutes(router: IRouter, cache: CacheSetupContract) {
  router.get(
    {
      path: '/api/cache_usage/example',
      options: {
        access: 'public',
      },
      security: {
        authz: AuthzDisabled.fromReason('example route'),
      },
      validate: false,
    },
    async (context, request, response) => {
      try {
        let time = await cache.store?.get(cns('time'));
        if (time) {
          return response.ok({
            body: {
              cacheHit: true,
              time,
            },
          });
        }
        time = new Date().toISOString();
        await sleep(400); // it's expensive to calc the time OK!
        await cache.store?.set(cns('time'), time, 10);
        return response.ok({
          body: {
            cacheHit: false,
            time,
          },
        });
      } catch (e) {
        console.error(e);
        return response.customError({
          statusCode: 500,
          body: e,
        });
      }
    }
  );
}
