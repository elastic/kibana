---
navigation_title: Authentication overview
---

# Authentication in Scout [scout-auth]

This page explains how authentication is set up in Scout, which identities exist, and which fixture uses which identity. For the hands-on API of each fixture, see [Browser authentication](./browser-auth.md) and [Authentication in API tests](./api-auth.md).

## Default setup in Scout server configs [scout-auth-default-setup]

When you start servers with `node scripts/scout start-server`, the default config sets (`src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/default`) configure authentication the same way Elastic Cloud does:

- **SAML is the default login method.** Elasticsearch gets a SAML realm named `cloud-saml-kibana`, and Kibana gets a matching `saml` provider with `order: 0`. The login selector is disabled, so any navigation to Kibana goes through SAML. A `basic` provider is registered with a higher order and is only reachable by opening `/login` directly.
- **A mock Identity Provider (IdP) replaces the real one.** Kibana loads a test plugin (`x-pack/platform/test/security_api_integration/plugins/saml_provider`) that answers SAML requests locally. On real Cloud deployments this role is played by the control plane.
- **Roles are predefined in `roles.yml`.** Stateful runs load `@kbn/es` `stateful_resources/roles.yml`, which mirrors the serverless roles (`admin`, `editor`, `viewer`, and so on). Serverless runs use the `roles.yml` of the selected project type. Serverless also disables the native realm, matching production.
- **Elasticsearch runs with security enabled** and a bootstrap superuser: `elastic` on stateful, `elastic_serverless` (file realm) on serverless. The password is `changeme` in both cases.

## Why Scout authenticates through SAML realm roles [scout-auth-why-saml]

In Cloud and Serverless a user never logs in with username and password against Elasticsearch directly. They log in through an IdP, and Elasticsearch maps the IdP groups to roles. The session cookie that Kibana issues is what grants access.

Scout tests follow the same path. When a test asks for role `viewer`:

1. The SAML session manager (`@kbn/test-saml-auth`) asks the mock IdP for an assertion with a generated user (`elastic_viewer`) whose roles attribute is `viewer`.
2. Kibana's SAML callback validates the assertion and issues a session cookie.
3. The cookie is cached per role and worker, then handed to the browser or to an API request.

This gives tests the same authentication and authorization path that real users get, so privilege bugs show up in tests. It also keeps tests portable: on Cloud runs the same calls perform a real SAML login with pre-provisioned users from `.ftr/role_users.json`, so no test code changes between local and Cloud.

## The user in the Scout config [scout-auth-config-user]

`ScoutTestConfig.auth` (`config.auth.username` / `config.auth.password`) comes from `servers.kibana.username` / `servers.kibana.password` in the server config. Locally it is the bootstrap superuser described above. On Cloud it points at an operator account.

Scout uses it in exactly two places, both worker scoped and both for framework plumbing:

- `esClient`, the Elasticsearch client used for data setup (archives, index cleanup, creating custom roles).
- `kbnClient`, the Kibana client used for saved objects, UI settings, spaces and similar setup.

Everything that represents a _user of the product_ goes through SAML instead.

## What each fixture does for auth [scout-auth-fixtures]

| Fixture                      | Scope  | Identity it uses                                                | Purpose                                                                                                                         |
| ---------------------------- | ------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `esClient`                   | worker | Config user (superuser)                                         | Test data setup and teardown against Elasticsearch                                                                              |
| `kbnClient`                  | worker | Config user (superuser)                                         | Test data setup and teardown through Kibana APIs                                                                                |
| `samlAuth`                   | worker | SAML session per role                                           | Creates and caches session cookies, provisions the per-worker custom role (`custom_role_worker_<n>`), deletes it on worker exit |
| `browserAuth`                | test   | SAML session cookie from `samlAuth`                             | Sets the `sid` cookie in the browser context so the UI runs as that role                                                        |
| `requestAuth`                | worker | API keys scoped to a role, created with an `admin` SAML session | Returns `apiKeyHeader` for calling public `api/*` endpoints, invalidates all keys on worker exit                                |
| `samlAuth.asInteractiveUser` | worker | SAML session cookie                                             | Returns `cookieHeader` for calling `internal/*` endpoints the way the UI does                                                   |
| `apiClient`                  | worker | None                                                            | Plain HTTP client. It sends no credentials unless you spread `apiKeyHeader` or `cookieHeader` into the request                  |

## Rules to follow [scout-auth-rules]

- **Do not use the config user as the user under test.** Never build your own Kibana or Elasticsearch client from `config.auth`, and never send `Authorization: Basic` with it. It is a superuser, so it hides authorization bugs, and it bypasses the SAML path that real users take. On Cloud that account may not even have the same privileges.
- **Do not hardcode credentials** such as `elastic` / `changeme`. Use `browserAuth`, `requestAuth` or `samlAuth` and let Scout resolve the identity for the environment.
- **Keep `kbnClient` and `esClient` for setup and cleanup only.** Assertions about what a user can see or do belong to a SAML session or API key for a specific role.
- **Prefer the least privileged role** that exercises the feature. Use `admin` only when testing admin-only behavior.
- **Use the custom role slot through the fixtures.** `samlAuth.setCustomRole()`, `loginWithCustomRole()` and `getApiKeyForCustomRole()` manage one custom role per worker. Do not create roles with other names and expect them to be cleaned up.
- **Do not rely on the native realm on serverless.** It is disabled there. Roles must come from `roles.yml` or a custom role descriptor.
