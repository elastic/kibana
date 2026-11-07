# @kbn/ui-ai-components

Standalone build of Kibana's AI buttons and icons for use in non-Kibana Elastic
applications (e.g. Cloud UI, design prototypes), so they can use the real
components instead of re-creating the AI gradient styles by hand.

## How it works

The source components live in `src/platform/kbn-ui/ai-components/`. This
packaging layer bundles them into a single JS file with webpack, replacing the
Kibana-only dependency (`@kbn/i18n`) with a lightweight stub via aliases.

The publish pipeline (`.buildkite/scripts/steps/kbn_ui_publish.sh`) runs the
build on merge to `main` whenever this package changes and publishes the
tarball to the internal Artifactory registry.

## Quick start

```bash
pnpm kbn bootstrap
src/platform/kbn-ui/ai-components/packaging/scripts/build.sh
```

Artifacts are written to `src/platform/kbn-ui/ai-components/target/`.

## Usage

Render the components inside an `EuiProvider`.

```tsx
import { AiButton, AiButtonIcon, AiIcon } from '@kbn/ui-ai-components';

<AiButton variant="accent" iconType="aiAssistantLogo" onClick={handleClick}>
  AI Assistant
</AiButton>

<AiButtonIcon iconType="sparkles" aria-label="AI Assistant" onClick={handleClick} />

<AiIcon iconType="sparkles" size="m" aria-label="AI Assistant" />
```

The package exports the same public API as the Kibana package: `AiButton`,
`AiButtonDefault`, `AiButtonEmpty`, `AiButtonIcon`, `AiIcon`,
`SvgAiGradientDefs`, `useAiButtonGradientStyles`, `useSvgAiGradient`, and their
types.

### Peer dependencies

| Package | Version |
|---------|---------|
| `@elastic/eui` | >= 112 |
| `@emotion/react` | >= 11.14 |
| `react` | >= 18 |
| `react-dom` | >= 18 |

## Further reading

- [Build details](./BUILD.md)
- [i18n approach](./I18N.md)
- [Source component README](../README.mdx)
