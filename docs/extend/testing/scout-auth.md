---
navigation_title: Authentication overview
---

# Authentication in Scout [scout-auth]

This article goes through how authentication is set up in Scout and which fixtures your tests can use to authenticate into the stack. For lower-level practical details, see [Browser authentication](./browser-auth.md) and [Authentication in API tests](./api-auth.md).

## Default setup [scout-auth-default-setup]

Scout uses [SAML](https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/saml) to authenticate in tests, the same way Elastic Cloud does. The login selector (the page that lets a user pick between authentication providers) is disabled, so every login goes straight to SAML.

| Deployment | Local run                               | Cloud run (ECH, MKI)                             |
| ---------- | --------------------------------------- | ------------------------------------------------ |
| Stateful   | SAML via a mock Identity Provider (IdP) | SAML via the real IdP with pre-provisioned users |
| Serverless | SAML via a mock Identity Provider (IdP) | SAML via the real IdP with pre-provisioned users |

Kibana's role definitions are defined in the `roles.yml` files in the `@kbn/es` package. They are Kibana's local copy of the [Elastic Cloud roles](https://www.elastic.co/docs/deploy-manage/users-roles/cloud-organization/user-roles#general-assign-user-roles-table) (`admin`, `editor`, `viewer`, and so on). Serverless uses the roles of the selected project type and has the native realm disabled.

::::::{warning}
The serverless files are copied from `elasticsearch-controller`, so a role change must land there first and be mirrored in `roles.yml` right after.
::::::

## Why SAML realm roles [scout-auth-why-saml]

In Cloud, users log in through an IdP and get roles from it. Scout follows the same path: when a test asks for role `viewer`, the mock IdP issues a SAML assertion for a generated user with that role, Kibana issues a session cookie, and Scout caches it per role and worker.

Tests exercise the same authentication and authorization path as real users. On Cloud runs the same calls perform a real SAML login with pre-provisioned users, so test code does not change.

## The user in the config [scout-auth-config-user]

`config.auth` is an internal Scout user with full privileges. Scout uses it only for `esClient` and `kbnClient`, which exist for test data setup and cleanup. Everything that represents a user of the product goes through SAML.

## What each fixture does [scout-auth-fixtures]

| Fixture                      | Identity                 | Purpose                                                                |
| ---------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| `esClient`, `kbnClient`      | Internal Scout user      | Data setup and cleanup                                                 |
| `samlAuth`                   | SAML session per role    | Creates and caches session cookies, manages the per-worker custom role |
| `browserAuth`                | SAML session cookie      | Sets the cookie in the browser so the UI runs as that role             |
| `samlAuth.asInteractiveUser` | SAML session cookie      | `cookieHeader` for `internal/*` endpoints                              |
| `requestAuth`                | API key scoped to a role | `apiKeyHeader` for public `api/*` endpoints                            |
| `apiClient`                  | None                     | Plain HTTP client. Spread a header from above to authenticate          |

## Rules [scout-auth-rules]

- **Do not use the config user as the user under test.** Never build your own client from `config.auth` or send basic auth with it. It has full privileges, so it hides authorization bugs and bypasses the SAML path.
- **Do not hardcode credentials.** Use `browserAuth`, `requestAuth` or `samlAuth`.
- **Keep `kbnClient` and `esClient` for setup and cleanup only.**
- **Prefer the least privileged role.** Use `admin` only when testing admin-only behavior. See [Test with minimal permissions](./scout-best-practices.md#test-with-minimal-permissions-avoid-admin-when-possible).
