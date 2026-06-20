# @kbn/custom-icons

A utility package, `@kbn/custom-icons`, that provides components for rendering icons related to Elastic Agents, Cloud Providers, third-party logos, and more.

## Components

### `<AgentIcon />`

```jsx
<AgentIcon agentName={agentName} />
```

This component renders an icon corresponding to the specified Elastic Agent name (`agentName`).

#### Props

- **`agentName`**: The name of the Elastic Agent for which the icon should be rendered.

### `<CloudProviderIcon />`

```jsx
<CloudProviderIcon cloudProvider={cloudProvider} />
```

This component renders an icon associated with the specified Cloud Provider (`cloudProvider`).

#### Props

- **`cloudProvider`**: The name of the Cloud Provider for which the icon should be rendered.

### `<LogoIcon />`

This component renders third-party logos (`openAi`, etc).

```jsx
<LogoIcon logoName="openAi" size="xl" />
```

#### Props
- **`logoName`**: The name of the logo to render (e.g. `'openAi'`).
- Also accepts [`EuiIconProps`](https://eui.elastic.co/#/display/icons) (e.g. `size`,  `title`, etc.).

#### Direct image access

You can also use `getLogoIcon(logoName, isDarkMode)` directly if you need the SVG path string:

```tsx
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { getLogoIcon } from '@kbn/custom-icons';

const MyComponent = () => {
  const { colorMode } = useEuiTheme();
  return <EuiIcon type={getLogoIcon('openAi', colorMode === 'DARK')} size="l" />;
};
```

## Adding a new logo

**1. Add compressed SVGs to `assets/`:**

```
assets/
  gemini.svg              (light mode — for light backgrounds)
  gemini_dark.svg         (dark mode — optional)
```

**2. Register in `src/components/logo_icon/get_logo_icon.ts`:**

```typescript
// Add imports
import geminiIcon from '../../../assets/gemini.svg';
import darkGeminiIcon from '../../../assets/gemini_dark.svg';

// Add to LOGO_NAMES
export const LOGO_NAMES = ['openAi', 'gemini'] as const;

// Add to logoIcons
const logoIcons: Record<LogoName, string> = {
  openAi: openAiIcon,
  gemini: geminiIcon,
};

// Add to darkLogoIcons (only if dark variant exists)
const darkLogoIcons: Record<LogoName, string> = {
  ...logoIcons,
  openAi: darkOpenAiIcon,
  gemini: darkGeminiIcon,
};
```

**3. Verify in Storybook** — new logos appear automatically in the "Custom Icons / LogoIcon" story.
