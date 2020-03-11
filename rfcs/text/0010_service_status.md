- Start Date: 2020-03-07
- RFC PR: https://github.com/elastic/kibana/pull/59621
- Kibana Issue: https://github.com/elastic/kibana/issues/41983

# Summary

A set API for describing the current status of a system (Core service or plugin)
in Kibana.

# Basic example

```ts
// Override default behavior and only elevate severity when elasticsearch is not available
core.status.set(
  core.status.core$.pipe(core => core.elasticsearch);
)
```

# Motivation

Kibana should do as much possible to help users keep their installation in a working state. This includes providing as much detail about components that are not working as well as ensuring that failures in one part of the application do not block using other portions of the application.

In order to provide the user with as much detail as possible about any systems that are not working correctly, the status mechanism should provide excellent defaults in terms of expressing relationships between services and presenting detailed information to the user.

# Detailed design

## Types

```ts
/**
 * The current status of a service at a point in time.
 */
type ServiceStatus = {
  /**
   * The current availability level of the service.
   */
  level: ServiceStatusLevel.available;
  /**
   * A high-level summary of the service status.
   */
  summary?: string;
  /**
   * A more detailed description of the service status.
   */
  detail?: string;
  /**
   * A URL to open in a new tab about how to resolve or troubleshoot the problem.
   */
  documentationUrl?: string;
  /**
   * Any JSON-serializable data to be included in the HTTP API response. Useful for providing more fine-grained, 
   * machine-readable information about the service status. May include status information for underlying features.
   */
  meta?: JSONObject;
} | {
  level: ServiceStatusLevel;
  summary: string; // required when level !== available
  detail?: string;
  documentationUrl?: string;
  meta?: object;
}

/**
 * The current "level" of availability of a service.
 */
enum ServiceStatusLevel {
  /**
   * Everything is working!
   */
  available,
  /**
   * Some features may not be working.
   */
  degraded,
  /**
   * The service is unavailable, but other functions that do not depend on this service should work.
   */
  unavailable,
  /**
   * Block all user functions and display the status page, reserved for Core services only.
   * Note: In the real implementation, this will be split out to a different type. Kept as a single type here to make
   * the RFC easier to follow.
   */
  critical
}

/**
 * Status of core services. Only contains entries for backend services that could have a non-available `status`.
 * For example, `context` cannot possibly be broken, so it is not included.
 */
interface CoreStatus {
  elasticsearch: ServiceStatus;
  http: ServiceStatus;
  savedObjects: ServiceStatus;
  uiSettings: ServiceStatus;
  metrics: ServiceStatus;
}

// Types that specify valid JSON values.
type JSONValue = string | number | boolean | null | JSONValue[] | JSONObject;
type JSONObject = Record<string, JSONValue>;
```

## API Design

### Plugin API

```ts
/**
 * The API exposed to plugins on CoreSetup.status
 */
interface StatusSetup {
  /**
   * Allows a plugin to specify a custom status dependent on its own criteria.
   * Completely overrides the default inherited status.
   */
  set(status$: Observable<ServiceStatus>): void;

  /**
   * Current status for all Core services.
   */
  core$: Observable<CoreStatus>;

  /**
   * Current status for all dependencies of the current plugin.
   * Each key of the `Record` is a plugin id.
   */
  plugins$: Observable<Record<string, ServiceStatus>>;

  /**
   * The default status of the plugin as specified in the "Status inheritance"
   * section below.
   * 
   * Useful when overriding the defaults with `set`.
   */
  inherited$: Observable<ServiceStatus>;
}
```

### HTTP API

The HTTP endpoint should return basic information about the Kibana node as well as the overall system status and the status of each individual system.

This API does not need to include UI-specific details like the existing API such as `uiColor` and `icon`.

```ts
/**
 * Response type for the endpoint: GET /api/status
 */
interface StatusResponse {
  /** server.name */
  name: string;
  /** server.uuid */
  uuid: string;
  /** Currently exposed by existing status API */
  version: {
    number: string;
    build_hash: string;
    build_number: number;
    build_snapshot: boolean;
  };
  /** Similar format to existing API, but slightly different shape */
  status: {
    /** See "Overall status calculation" section below */
    overall: ServiceStatus;
    core: CoreStatus;
    plugins: Record<string, ServiceStatus>;
  }
}
```

## Behaviors

### Levels

Each member of the `ServiceStatusLevel` enum has specific behaviors associated with it:
- **`available`**:
  - All endpoints and apps associated with the service are accessible
- **`degraded`**:
  - All endpoints and apps are available by default
  - Some APIs may return `503 Unavailable` responses. This must be implemented directly by the service.
  - Some plugin contract APIs may throw errors. This must be implemented directly by the service.
- **`unavailable`**:
  - All endpoints (with some exceptions in Core) in Kibana return a `503 Unavailable` responses by default. This is automatic.
  - When trying to access any app associated with the unavailable service, the user is presented with an error UI with detail about the outage.
  - Some plugin contract APIs may throw errors. This must be implemented directly by the service.
- **`critical`**:
  - All endpoints (with some exceptions in Core) in Kibana return a `503 Unavailable` response by default. This is automatic.
  - All applications redirect to the system-wide status page with detail about which services are down and any relevant detail. This is automatic.
  - Some plugin contract APIs may throw errors. This must be implemented directly by the service.
  - This level is reserved for Core services only.

### Overall status calculation

The status level of the overall system is calculated to be the highest severity status of all core services and plugins.

The `summary` property is calculated as follows:
- If the overall status level is `available`, the `summary` is `"Kibana is operating normally"`
- If a single core service or plugin is not `available`, the `summary` is `Kibana is ${level} due to ${serviceName}. See ${statusPageUrl} for more information.`
- If multiple core services or plugins are not `available`, the `summary` is `Kibana is ${level} due to multiple components. See ${statusPageUrl} for more information.`

### Status inheritance

By default, plugins inherit their status from all Core services and their dependencies on other plugins. The default status for a plugin follows this algorithm:
```js
// pseudo-code
function getPluginStatus() {
  if any core service is `critical`, return `critical`
  else if any core service is `unavailable`, return `unavailable`
  else if any core service is `degraded`, return `degraded`

  if any required dep is `critical`, return `critical`
  else if any required dep is `unavailable`, return `unavailable`
  else if any required dep is `degraded`, return `degraded`

  if any optional dep is `critical`, return `degraded`
  else if any optional dep is `unavailable`, return `degraded`
  else if any optional dep is `degraded`, return `degraded`

  return 'available'
}
```

If a plugin calls the `StatusSetup#set` API, the inherited status is completely overridden. They status the plugin specifies is the source of truth. If a plugin wishes to "merge" its custom status with the inherited status calculated by Core, it may do so by using the `StatusSetup#inherited$` property in its calculated status.

If a plugin never calls the `StatusSetup#set` API, the plugin's status defaults to the inherited status.

_Disabled_ plugins, that is plugins that are explicitly disabled in Kibana's configuration, do not have any status. They are not present in any status APIs and are **not** considered `unavailable`. Disabled plugins are excluded from the status inheritance calculation, even if a plugin has a optional dependency on a disabled plugin. In summary, if a plugin has an optional dependency on a disabled plugin, the plugin will not be considered `degraded` just because that optional dependency is disabled.

### HTTP responses

As specified in the [_Levels section_](#levels), a service's HTTP endpoints will respond with `503 Unavailable` responses in some status levels.

In both the `critical` and `unavailable` levels, all of a service's endpoints will return 503s. However, in the `degraded` level, it is up to service authors to decide which endpoints should return a 503. This may be implemented directly in the route handler logic or by using any of the [utilities provided](#status-utilities).

## Status Utilities

Though many plugins should be able to rely on the default status inheritance and associated behaviors, there are common patterns and overrides that some plugins will need. The status service should provide some utilities for these common patterns out-of-the-box.

```ts
/**
 * Extension of the main Status API
 */
interface StatusSetup {
  /**
   * Helpers for expressing status in HTTP routes.
   */
  http: {
    /**
     * High-order route handler function for wrapping routes with 503 logic based
     * on a predicate.
     * 
     * @remarks
     * When a 503 is returned, it also includes detailed information from the service's
     * current `ServiceStatus` including `meta` information.
     * 
     * @example
     * ```ts
     * router.get(
     *   { path: '/my-api' }
     *   unavailableWhen(
     *     ServiceStatusLevel.degraded,
     *     async (context, req, res) => {
     *       return res.ok({ body: 'done' });
     *     }
     *   )
     * )
     * ```
     * 
     * @param predicate When a level is specified, if the plugin's current status
     *                  level is >= to the severity of the  specified level, route
     *                  returns a 503. When a function is specified, if that
     *                  function returns `true`, a 503 is returned.
     * @param handler The route handler to execute when a 503 is not returned.
     */
    unavailableWhen<P, Q, B>(
      predicate: ServiceStatusLevel |
        (self: ServiceStatus, core: CoreStatus, plugins: Record<string, ServiceStatus>) => boolean,
      handler: RouteHandler<P, Q, B>
    ): RouteHandler<P, Q, B>;
  }
}
```

## Additional Examples

### Combine inherited status with check against external dependency
```ts
const getExternalDepHealth = async () => {
  const resp = await window.fetch('https://myexternaldep.com/_healthz');
  return resp.json();
}

// Create an observable that checks the status of an external service every every 10s 
const myExternalDependency$: Observable<ServiceStatusLevel> = interval(10000).pipe(
  mergeMap(() => of(getExternalDepHealth())),
  map(health => health.ok ? ServiceStatusLevel.available : ServiceStatusLevel.unavailable),
  catchError(() => of(ServiceStatusLevel.unavailable))
);

// Merge the inherited status with the external check
core.status.set(
  combineLatest(
    core.status.inherited$,
    myExternalDependency$
  ).pipe(
    map(([inherited, external]) => ({
      level: Math.max(inherited.level, external)
    }))
  )
);
```

# Drawbacks

1. **The default behaviors and inheritance of statuses may appear to be "magic" to developers who do not read the documentation about how this works.** Compared to the legacy status mechanism, these defaults are much more opinionated and the resulting status is less explicit in plugin code compared to the legacy `mirrorPluginStatus` mechanism.
2. **The default behaviors and inheritance may not fit real-world status very well.** If many plugins must customize their status in order to opt-out of the defaults, this would be a step backwards from the legacy mechanism.

# Alternatives

We could somewhat reduce the complexity of the status inheritance by leveraging the dependencies between plugins to enable and disable plugins based on whether or not their upstream dependencies are available. This may simplify plugin code but would greatly complicate how Kibana fundamentally operates, requiring that plugins may get stopped and started multiple times within a single Kibana server process. We would be trading simplicity in one area for complexity in another.

# Adoption strategy

By default, most plugins would not need to do much at all. Today, very few plugins leverage the legacy status system. The majority of ones that do, simply call the `mirrorPluginStatus` utility to follow the status of the legacy elasticsearch plugin.

Plugins that wish to expose more detail about their availability will easily be able to do so, including providing detailed information such as links to documentation to resolve the problem.

Depending on [Drawback #3](#drawbacks), we may need to break the existing status API, however this seems unlikely. This could have a large impact on users who use this API for checking Kibana node health in load balancer configurations.

# How we teach this

This largely follows the same patterns we have used for other Core APIs: Observables, composable utilties, etc.

This should be taught using the same channels we've leveraged for other Kibana Platform APIs: API documentation, additions to the [Migration Guide](../../src/core/MIGRATION.md) and [Migration Examples](../../src/core/MIGRATION_EXMAPLES.md).

# Unresolved questions
