---
navigation_title: Authentication overview
---

# Authentication in Scout [scout-auth]

This article goes through how authentication is set up in Scout and which fixtures your tests can use to authenticate into the stack. For higher-level practical details, see [Browser authentication](./browser-auth.md) and [Authentication in API tests](./api-auth.md).

## Default setup [scout-auth-default-setup]

Scout uses [SAML](https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/saml) to authenticate in tests, the same way Elastic Cloud does. The login selector (the page that lets a user pick between authentication providers) is disabled, so every login goes straight to SAML.

| Deployment | Local run                               | Cloud run (ECH, MKI)                                    |
| ---------- | --------------------------------------- | ------------------------------------------------------- |
| Stateful   | SAML via a mock Identity Provider (IdP) | SAML via Elastic Cloud's IdP with pre-provisioned users |
| Serverless | SAML via a mock Identity Provider (IdP) | SAML via Elastic Cloud's IdP with pre-provisioned users |

Tests use Elasticsearch role definitions from the `roles.yml` files in the `@kbn/es` package. The serverless files are a copy of the [Elastic Cloud project roles](https://www.elastic.co/docs/deploy-manage/users-roles/cloud-organization/user-roles#general-assign-user-roles-table) (`admin`, `editor`, `viewer`, and so on) for the selected project type, and serverless has the native realm disabled. The stateful file is test-only: `viewer` and `editor` mirror the built-in Elasticsearch roles, and `admin` is a test role that does not exist in stateful Elasticsearch. It exists so deployment-agnostic tests can use the same role names in both.

::::::{warning}
The serverless files are copied from `elasticsearch-controller`, so a role change must land there first and be mirrored in `roles.yml` right after.
::::::

## How SAML users get their roles [scout-auth-why-saml]

In Cloud, users log in through an IdP, and Elasticsearch role mappings turn the groups in the SAML assertion into roles. Scout follows the same path. When a test asks for role `viewer`:

1. Scout creates a SAML response signed with the mock IdP certificate for a generated user, with `viewer` in the `groups` attribute, and posts it to Kibana.
2. Elasticsearch validates the assertion and maps the group to the `viewer` role.
3. Kibana returns a session cookie.
4. Scout caches the cookie per role and Playwright worker. When a test fails, Playwright retries it on a new worker with a newly created session.

Locally the browser redirect to the IdP is skipped. What tests share with real users is the realm, the role mapping, and the authorization checks. On Cloud runs the same calls perform a real SAML login with pre-provisioned users, so test code does not change.

::::::{warning}
Local authentication is partly mocked. A test passing locally does not prove the feature works on MKI or ECH, where the real IdP and Elastic Cloud configuration are used.
::::::

## The user in the config [scout-auth-config-user]

`config.auth` is an internal Scout user with full privileges. On MKI it replicates the operator user, on ECH it is a superuser. Scout uses it for `esClient` and `kbnClient`, which exist for test data setup and cleanup, and internally to read the Kibana version. Everything that represents a user of the product goes through SAML.

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
