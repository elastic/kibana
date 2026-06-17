---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/development-basepath.html
---

# Considerations for basepath [development-basepath]

In dev mode, {{kib}} by default runs behind a proxy which adds a random path component to its URL.

You can set this explicitly using [`server.basePath`](/reference/configuration-reference/general-settings.md#server-basePath). This setting cannot end in a slash (/).

Use [`server.rewriteBasePath`](/reference/configuration-reference/general-settings.md#server-rewriteBasePath) to tell {{kib}} if it should remove the basePath from requests it receives, and to prevent a deprecation warning at startup.

If you want to turn off the basepath when in development mode, start {{kib}} with the `--no-base-path` flag

```bash
yarn start --no-base-path
```

