# CSS in Kibana

This document provides an overview of the various CSS approaches used in the Kibana codebase and outlines a strategy for unifying them using Emotion.

## Current CSS Approaches

Kibana currently uses a mix of CSS approaches:

### 1. EUI Components (@elastic/eui)

**Description**: Elastic UI Framework provides a collection of React components with built-in styling.

**Impact**: This is the primary UI framework used throughout the codebase. Most UI components leverage EUI components which handle their own styling internally.

**Usage Example**:
```tsx
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

const MyComponent = () => (
  <EuiFlexGroup>
    <EuiFlexItem>
      <EuiButton>Click me</EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);
```

### 2. CSS/SCSS Files

**Description**: Traditional CSS and SCSS files imported directly into components.

**Impact**: A significant portion of the codebase uses .scss files, especially for legacy components and specific plugins. The webpack configuration shows the build pipeline is set up to handle both CSS and SCSS files.

**Usage Example**:
```tsx
import './my_component.scss';

const MyComponent = () => (
  <div className="my-component">
    <div className="my-component__header">Header</div>
  </div>
);
```

### 3. Emotion (@emotion/react, @emotion/css)

**Description**: A CSS-in-JS library that allows writing styles directly in JavaScript.

**Impact**: Emotion is already in use throughout the codebase, primarily in newer components. It's a dependency in package.json and is widely imported across many files.

**Usage Example**:
```tsx
import { css } from '@emotion/react';

const MyComponent = () => (
  <div
    css={css`
      color: blue;
      padding: 20px;
    `}
  >
    Styled with Emotion
  </div>
);
```

### 4. Styled Components (styled-components)

**Description**: Another CSS-in-JS library similar to Emotion but with a different API.

**Impact**: Used in specific parts of the codebase, particularly in the Observability plugins (Uptime, Synthetics) and some test plugins.

**Usage Example**:
```tsx
import styled from 'styled-components';

const StyledDiv = styled.div`
  color: red;
  margin: 10px;
`;

const MyComponent = () => <StyledDiv>Styled with styled-components</StyledDiv>;
```

## CSS Framework Distribution

Based on analysis of the codebase:

| CSS Approach | Approximate Usage |
|--------------|-------------------|
| EUI Components | ~60% (Used as the primary UI framework) |
| Emotion | ~20% (Growing adoption in newer components) |
| SCSS/CSS Files | ~15% (Legacy code and specific plugin styles) |
| Styled Components | ~5% (Limited to specific solutions/plugins) |

## Migration Strategy to Emotion

### Phase 1: Setup and Standardization

1. **Establish Emotion Patterns**
   - Create a central theme provider using `@emotion/react`'s `ThemeProvider`
   - Define a common theme object with colors, spacing, typography, etc.
   - Create shared emotion utilities and mixins

2. **Documentation**
   - Document best practices for Emotion usage
   - Create example components that demonstrate proper Emotion implementation

### Phase 2: EUI Integration

1. **EUI with Emotion**
   - EUI components will remain the primary UI building blocks
   - Use Emotion's `css` prop for custom styling of EUI components
   - Create a library of common EUI + Emotion patterns

2. **Create a Components Library**
   - Build a set of composite components that use EUI + Emotion
   - These should cover common UI patterns specific to Kibana

### Phase 3: Migration of Existing Code

1. **SCSS to Emotion Migration**
   - Prioritize high-impact, frequently used components
   - Convert SCSS files to Emotion styles
   - Maintain the same visual appearance but using Emotion's API

2. **Styled Components to Emotion Migration**
   - Identify all styled-components usage (primarily in Observability plugins)
   - Convert to equivalent Emotion implementation
   - Ensure consistent API across all components

### Phase 4: New Development Standards

1. **Code Reviews and Linting**
   - Add linting rules to enforce Emotion usage for new components
   - Update code review guidelines to include CSS approach
   
2. **Refactoring Large Features**
   - Identify large features that use multiple CSS approaches
   - Plan dedicated sprints to refactor these to use Emotion consistently

## Implementation Guidelines

### Emotion Setup

```tsx
// src/core/public/emotion_theme.ts
import { Theme } from '@emotion/react';

export const kibanaTheme: Theme = {
  colors: {
    primary: '#006BB4',
    // ...other colors
  },
  spacing: {
    xs: '4px',
    s: '8px',
    m: '16px',
    // ...other spacing values
  },
  // ...other theme values
};
```

### Using Emotion with EUI

```tsx
import { css } from '@emotion/react';
import { EuiButton } from '@elastic/eui';

const MyComponent = () => (
  <div
    css={css`
      padding: ${({ theme }) => theme.spacing.m};
      background: ${({ theme }) => theme.colors.lightShade};
    `}
  >
    <EuiButton
      css={css`
        margin-top: ${({ theme }) => theme.spacing.s};
      `}
    >
      Custom Styled Button
    </EuiButton>
  </div>
);
```

### Converting SCSS Files

Original SCSS:
```scss
.my-component {
  padding: 16px;
  
  &__header {
    font-size: 18px;
    margin-bottom: 8px;
  }
  
  &__content {
    color: #333;
  }
}
```

Emotion Equivalent:
```tsx
import { css } from '@emotion/react';

const myComponentStyles = {
  wrapper: css`
    padding: ${({ theme }) => theme.spacing.m};
  `,
  header: css`
    font-size: 18px;
    margin-bottom: ${({ theme }) => theme.spacing.s};
  `,
  content: css`
    color: #333;
  `,
};

const MyComponent = () => (
  <div css={myComponentStyles.wrapper}>
    <div css={myComponentStyles.header}>Header</div>
    <div css={myComponentStyles.content}>Content</div>
  </div>
);
```

### Converting Styled Components

Original Styled Components:
```tsx
import styled from 'styled-components';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 16px;
`;

const StyledHeader = styled.h2`
  font-size: 18px;
  color: ${(props) => props.theme.colors.title};
`;
```

Emotion Equivalent:
```tsx
import { css } from '@emotion/react';

const MyComponent = () => (
  <div
    css={css`
      display: flex;
      flex-direction: column;
      padding: ${({ theme }) => theme.spacing.m};
    `}
  >
    <h2
      css={css`
        font-size: 18px;
        color: ${({ theme }) => theme.colors.title};
      `}
    >
      Header
    </h2>
  </div>
);
```

## Benefits of Unification

1. **Consistent API**: One way to style components across the codebase
2. **Better TypeScript Integration**: Emotion has excellent TypeScript support
3. **Performance**: Reduced bundle size by eliminating duplicate styling libraries
4. **Maintainability**: Easier onboarding and knowledge sharing with a single approach
5. **Theme Integration**: Centralized theming with type safety

## Timeline Recommendation

- **Months 1-2**: Setup, documentation, and pilot migrations
- **Months 3-6**: Focus on converting styled-components and high-impact SCSS
- **Months 7-12**: Gradual migration of remaining components
- **Month 12+**: All new development uses the unified Emotion approach

## References

- [Emotion Documentation](https://emotion.sh/docs/introduction)
- [EUI Documentation](https://elastic.github.io/eui/)
- [Styled Components to Emotion Migration Guide](https://emotion.sh/docs/styled-components-migration)
