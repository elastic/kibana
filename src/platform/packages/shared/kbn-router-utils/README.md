# @kbn/router-utils

This package provides util functions when working with the router.

## getRouterLinkProps

Useful to generate link component properties for HTML elements, this link properties will allow them to behave as native links and handle events such as open in a new tab, or client-side navigation without refreshing the whole page.

### Example

We want a button to both navigate to Discover client-side or open on a new window.

```ts
const DiscoverLink = (discoverLinkParams) => {
  const discoverUrl = discover.locator?.getRedirectUrl(discoverLinkParams);

  const navigateToDiscover = () => {
    discover.locator?.navigate(discoverLinkParams);
  };

  const linkProps = getRouterLinkProps({
    href: discoverUrl,
    onClick: navigateToDiscover,
  });

  return (
    <>
      <EuiButton {...linkProps}>
        {discoverLinkTitle}
      </EuiButton>
    </>
  );
};
```
