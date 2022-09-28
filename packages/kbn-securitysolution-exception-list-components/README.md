# @kbn/securitysolution-exception-list-components

This is where the building UI components of the Exception-List live
Most of the components here are imported from `x-pack/plugins/security_solutions/public/detection_engine` 

# Aim 

TODO

# Pattern used

```
component
    index.tsx
    index.styles.ts <-- to hold styles if the component has many custom styles
    use_component.ts <-- for logic if the Presentational Component has logic
    index.test.tsx
    use_component.test.tsx
```

# Next

- Now the `ExceptionItems, ExceptionItemCard
and ExceptionItemCardMetaInfo
  ` receive `securityLinkAnchorComponent, exceptionsUtilityComponent
, and exceptionsUtilityComponent
` as props to avoid moving all the `common` components under the `x-pack` at once, later we should move all building blocks to this `kbn-package`
