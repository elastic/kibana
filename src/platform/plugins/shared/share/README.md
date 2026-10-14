# Share

URL locators, short URLs, and the share menu used by Kibana apps.

Prefer a destination app's locator on its plugin contract. Use `plugins.share.url.locators.get('ID')` when you cannot take that dependency.

```ts
const locator = plugins.share.url.locators.create({
  id: 'MY_APP_LOCATOR',
  getLocation: async (params: { productId: string }) => ({
    app: 'myApp',
    path: `/products/${params.productId}`,
    state: {},
  }),
});

await locator.navigate({ productId: '123' });
```

- `getRedirectUrl(params)` keeps locator state (and version) on a redirect URL.
- `getUrl(params)` returns the destination path only and drops that state. Persist locator `id`, version, and params instead of the URL string so migrations still work.

```ts
const shortUrl = await plugins.share.url.shortUrls.get(null).create({
  locator,
  params: { productId: '123' },
});
// Resolves at `/app/r/s/<slug>`
```

See [`common/url_service/locators/README.md`](common/url_service/locators/README.md) and [`examples/locator_examples`](../../../../../examples/locator_examples).
