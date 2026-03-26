# Troubleshooting

## Common issues

### `Module not found: @kbn/i18n`

The webpack aliases are not resolving. Ensure you are building via
`./scripts/build.sh` (or the root-level convenience script) and not invoking
webpack with a different config.

### Type errors after updating the source component

Run the packaging build — the type-validation step will report mismatches
between source types and the standalone `packaging/react/types.ts`. Update
the standalone types to match.

### Runtime `Cannot read properties of undefined`

The most likely cause is a missing peer dependency. Ensure `@elastic/eui`,
`@emotion/react`, `@emotion/css`, `react`, and `react-dom` are installed in the
consuming application.

### CSS / styling issues

The component relies on EUI's theme provider. Wrap your application in
`<EuiProvider>` (or the equivalent in your EUI version) before rendering
`<OneNavigation>`.
