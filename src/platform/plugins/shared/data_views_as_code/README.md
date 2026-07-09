# Data views as code

This plugin contains the defined endpoints for data views as code, following the as code standards.

Why a different plugin from `@kbn/data-views-plugin`? Because the as code utilities, schemas and transforms, rely on `@kbn/data-views-plugin` mainly for typing. This means that we can't reuse this utilities inside `@kbn/data-views-plugin` without causing a circular dependency. That can be fixed by creating a new package that relies on this pieces.
