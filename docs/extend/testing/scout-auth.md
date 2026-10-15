---
navigation_title: Authentication overview
---

# Authentication in Scout [scout-auth]

How authentication is set up in Scout and which fixture uses which identity. For usage, see [Browser authentication](./browser-auth.md) and [Authentication in API tests](./api-auth.md).

## Default setup [scout-auth-default-setup]

The default Scout server configs mirror Elastic Cloud:

- **SAML is the default login method**, backed by a mock Identity Provider (IdP) plugin that runs locally. The login selector is disabled.
- **Roles come from `roles.yml`** (`admin`, `editor`, `viewer`, and so on). Serverless uses the roles of the selected project type and has the native realm disabled.
- **Elasticsearch runs with security enabled** and a bootstrap superuser (`elastic` on stateful, `elastic_serverless` on serverless).

## Why SAML realm roles [scout-auth-why-saml]

In Cloud, users log in through an IdP and get roles from it. Scout follows the same path: when a test asks for role `viewer`, the mock IdP issues a SAML assertion for a generated user with that role, Kibana issues a session cookie, and Scout caches it per role and worker.

Tests exercise the same authentication and authorization path as real users. On Cloud runs the same calls perform a real SAML login with pre-provisioned users, so test code does not change.

## The user in the config [scout-auth-config-user]

`config.auth` is the bootstrap superuser (an operator account on Cloud). Scout uses it only for `esClient` and `kbnClient`, which exist for test data setup and cleanup. Everything that represents a user of the product goes through SAML.

## What each fixture does [scout-auth-fixtures]

| Fixture                      | Identity                 | Purpose                                                                |
| ---------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| `esClient`, `kbnClient`      | Config superuser         | Data setup and cleanup                                                 |
| `samlAuth`                   | SAML session per role    | Creates and caches session cookies, manages the per-worker custom role |
| `browserAuth`                | SAML session cookie      | Sets the cookie in the browser so the UI runs as that role             |
| `samlAuth.asInteractiveUser` | SAML session cookie      | `cookieHeader` for `internal/*` endpoints                              |
| `requestAuth`                | API key scoped to a role | `apiKeyHeader` for public `api/*` endpoints                            |
| `apiClient`                  | None                     | Plain HTTP client. Spread a header from above to authenticate          |

## Rules [scout-auth-rules]

- **Do not use the config user as the user under test.** Never build your own client from `config.auth` or send basic auth with it. It is a superuser, so it hides authorization bugs and bypasses the SAML path.
- **Do not hardcode credentials.** Use `browserAuth`, `requestAuth` or `samlAuth`.
- **Keep `kbnClient` and `esClient` for setup and cleanup only.**
- **Prefer the least privileged role.** Use `admin` only when testing admin-only behavior.
