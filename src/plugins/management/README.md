# Management Plugin

This plugins contains the "Stack Management" page framework. It offers navigation and an API
to link individual management section into it. This plugin does not contain any individual
management section itself.

## Cards navigation

This plugin offers a special version of its landing page with a special feature called "cards navigation".
This feature can be enabled by calling the `setupCardsNavigation` method from the `management` plugin from
your plugin's `setup` method:

```
  management.setupCardsNavigation({ enabled: true });
```

The cards that will be shown are defined in the `packages/kbn-management/cards_navigation/src/consts.tsx` file
and they are grouped into categories. These cards are computed based on the `SectionsService` that is provided
in the `management` plugin.

### Adding a new card to the navigation

For adding a new item to the navigation all you have to do is edit the `packages/kbn-management/cards_navigation/src/consts.tsx`
file and add two things:

* Add the app id into the `appIds` enum (make sure that the app_id value matches the one from the plugin)
* Add a new entry to the `appDefinitions` object. In here you can specify the category where you want it to be, icon and description.


### Removing an item from the navigation

If card needs to be hidden from the navigation you can specify that by using the `hideLinksTo` prop:

```
  management.setupCardsNavigation({
    enabled: true,
    hideLinksTo: [appIds.MAINTENANCE_WINDOWS],
  });
```

More specifics about the `setupCardsNavigation` can be found in `packages/kbn-management/cards_navigation/readme.mdx`.
