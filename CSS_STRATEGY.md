# Emotion CSS Unification Strategy

This document outlines a detailed implementation strategy for unifying the Kibana codebase's CSS approaches using Emotion. It includes specific guidance for engineers who may be new to CSS-in-JS concepts.

## CSS-in-JS Fundamentals for New Engineers

Before diving into the migration strategy, it's important to understand some core concepts:

### What is CSS-in-JS?

CSS-in-JS is an approach to styling where CSS is written directly in JavaScript/TypeScript files rather than in separate CSS files. Benefits include:

- **Scoped styles**: Styles only apply to the components they're attached to
- **Dynamic styling**: Styles can respond to props and state
- **TypeScript integration**: Better type safety for styles
- **No class name collisions**: Each style is uniquely generated
- **Co-location**: Styles live with the components that use them

### Emotion Basics

Emotion is a popular CSS-in-JS library that offers two main styling approaches:

1. **The `css` prop**: Add styles directly to elements
   ```tsx
   <div css={css`color: red;`}>Red text</div>
   ```

2. **The `styled` API**: Create styled components
   ```tsx
   const RedText = styled.div`color: red;`;
   <RedText>Red text</RedText>
   ```

## Why Emotion is the Best Choice for Unification

1. **Already in Use**: Emotion is already a dependency and used in many parts of the codebase
2. **TypeScript Support**: Strong typing support with theme intellisense
3. **Performance**: Better runtime performance than alternatives
4. **Flexibility**: Works with both the css prop pattern and styled pattern
5. **EUI Compatibility**: Works well alongside EUI components
6. **Developer Experience**: Simpler API compared to alternatives, making it easier to learn

## Implementation Strategy

### Step 1: Create a Centralized Theme

First, establish a centralized theme that pulls values from EUI:

```tsx
// src/core/public/theme/emotion_theme.ts
import { createTheme, euiLightVars, euiDarkVars } from '@elastic/eui';
import { Theme } from '@emotion/react';

// Create TypeScript interface to extend the Emotion theme type
// This provides autocomplete for your custom theme properties
interface KibanaTheme extends Theme {
  kibana: {
    panels: {
      borderRadius: string;
      boxShadow: string;
    };
    typography: {
      code: {
        fontSize: string;
        fontFamily: string;
      };
    };
    // Add other custom properties
  };
}

// Light theme
export const lightTheme: KibanaTheme = {
  ...createTheme({ colors: euiLightVars }),
  // Add Kibana-specific values
  kibana: {
    panels: {
      borderRadius: '4px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    typography: {
      code: {
        fontSize: '0.85em',
        fontFamily: 'Roboto Mono, monospace',
      },
    },
    // Add other custom values
  }
};

// Dark theme
export const darkTheme: KibanaTheme = {
  ...createTheme({ colors: euiDarkVars }),
  // Add Kibana-specific values - note different shadow for dark mode
  kibana: {
    panels: {
      borderRadius: '4px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    },
    typography: {
      code: {
        fontSize: '0.85em',
        fontFamily: 'Roboto Mono, monospace',
      },
    },
    // Add other custom values
  }
};
```

#### Why a centralized theme is important:

- **Single source of truth**: All styling values come from one place
- **Consistency**: UI elements look consistent throughout the app
- **Easy updates**: Change a value in one place to update it everywhere
- **Type safety**: TypeScript catches theme usage errors

#### For Junior Engineers:

- The theme is like a dictionary of style values that your components can reference
- By extending the Emotion `Theme` type, you get autocomplete when using theme values
- EUI already has a theme system - we're extending it with our own Kibana-specific values
- Light and dark themes share the same structure but have different values

### Step 2: Set Up Global Theme Provider

Add the Emotion ThemeProvider at the app root:

```tsx
// Modify src/core/public/application/index.tsx or equivalent
import { ThemeProvider } from '@emotion/react';
import { lightTheme, darkTheme } from './theme/emotion_theme';
import { useKibanaTheme } from './hooks/use_kibana_theme'; // Hypothetical hook that tracks theme preference

const AppRoot = ({ children }) => {
  // This hook would determine if the user has selected dark mode
  // It could read from localStorage, user preferences API, etc.
  const { isDarkMode } = useKibanaTheme();
  
  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      {children}
    </ThemeProvider>
  );
};

// In the main app wrapper
return (
  <AppRoot>
    <App />
  </AppRoot>
);
```

#### Benefits:
- Theme values available throughout the application
- Automatic switching between light and dark modes
- Single source of truth for design tokens

#### For Junior Engineers:

**What is ThemeProvider?**

ThemeProvider is a React context provider that makes your theme object available to all descendant components. Here's how it works:

1. You wrap your application (or a section of it) in a `ThemeProvider`
2. You pass your theme object as a prop
3. Any component inside that provider can access the theme

**How to access the theme in a component:**

```tsx
import { useTheme } from '@emotion/react';
import { css } from '@emotion/react';

const MyComponent = () => {
  // Get the theme object
  const theme = useTheme();
  
  return (
    <div
      css={css`
        // Use theme values in your styles
        background-color: ${theme.colors.body};
        border-radius: ${theme.kibana.panels.borderRadius};
        box-shadow: ${theme.kibana.panels.boxShadow};
        padding: ${theme.euiSize};
      `}
    >
      Themed Content
    </div>
  );
};
```

**Theme Switching Tips:**

- Store theme preference in localStorage or user settings
- Add a theme toggle button in the UI
- Consider respecting the user's OS-level preference with `prefers-color-scheme` media query

### Step 3: Create Utility Components and Helpers

Develop a library of reusable style utilities:

```tsx
// src/core/public/theme/emotion_utils.ts
import { css, SerializedStyles } from '@emotion/react';

/**
 * Standard media query breakpoints for responsive design
 */
export const mediaQueries = {
  small: '@media (max-width: 767px)',
  medium: '@media (min-width: 768px) and (max-width: 1199px)',
  large: '@media (min-width: 1200px)',
  // Add responsive print media query
  print: '@media print',
};

/**
 * Common CSS patterns for layouts
 */
export const commonStyles = {
  // Column layout with gap
  flexColumn: (gap = '16px'): SerializedStyles => css`
    display: flex;
    flex-direction: column;
    gap: ${gap};
  `,
  
  // Row layout with gap
  flexRow: (gap = '16px'): SerializedStyles => css`
    display: flex;
    flex-direction: row;
    gap: ${gap};
  `,
  
  // Card container with shadow
  card: css`
    padding: ${({theme}) => theme.euiSize};
    border-radius: ${({theme}) => theme.kibana.panels.borderRadius};
    box-shadow: ${({theme}) => theme.kibana.panels.boxShadow};
    background-color: ${({theme}) => theme.colors.body};
  `,
  
  // Truncate text with ellipsis
  truncateText: css`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  
  // Visually hide an element but keep it accessible for screen readers
  visuallyHidden: css`
    position: absolute;
    height: 1px;
    width: 1px;
    overflow: hidden;
    clip: rect(1px, 1px, 1px, 1px);
    white-space: nowrap;
  `,
};

/**
 * Helper for creating responsive styles
 */
export const responsive = {
  /**
   * Apply different styles based on screen size
   */
  styles: ({ small, medium, large, default: defaultStyle }: {
    small?: SerializedStyles;
    medium?: SerializedStyles;
    large?: SerializedStyles;
    default: SerializedStyles;
  }) => css`
    ${defaultStyle}
    
    ${small && `${mediaQueries.small} { ${small} }`}
    ${medium && `${mediaQueries.medium} { ${medium} }`}
    ${large && `${mediaQueries.large} { ${large} }`}
  `,
};

/**
 * Animation utilities
 */
export const animations = {
  fadeIn: css`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    animation: fadeIn 0.3s ease-in-out;
  `,
  
  slideIn: css`
    @keyframes slideIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    animation: slideIn 0.3s ease-out;
  `,
};
```

#### Example Usage

```tsx
import { css } from '@emotion/react';
import { commonStyles, mediaQueries, responsive, animations } from '../../theme/emotion_utils';

const MyComponent = () => (
  <div
    css={css`
      ${commonStyles.card}
      ${animations.fadeIn}
      
      // Use media queries
      ${mediaQueries.small} {
        padding: 8px;
      }
    `}
  >
    <h2
      css={css`
        ${commonStyles.truncateText}
        font-size: 18px;
      `}
    >
      Card Title That Might Be Too Long
    </h2>
    
    {/* Using the responsive helper */}
    <div
      css={responsive.styles({
        default: css`flex-direction: row;`,
        small: css`flex-direction: column;`,
      })}
    >
      Content that changes layout on different screens
    </div>
  </div>
);
```

#### Benefits

- **Reusability**: Write commonly used patterns once and reuse them
- **Consistency**: Standardized breakpoints and styles
- **Maintainability**: Update styles in one place
- **Performance**: Shared styles help reduce CSS size

#### For Junior Engineers

**Understanding the utility approach:**

1. **What are utility styles?**  
   Think of them like building blocks. Instead of writing the same CSS over and over, you import pre-written styles.

2. **How responsive styles work:**  
   - Media queries define different screen sizes (small, medium, large)
   - You can apply different styles for each screen size
   - The responsive helper makes this simpler by handling the query syntax for you

3. **Tips for writing good utility functions:**
   - Make them customizable with parameters where appropriate
   - Add JSDoc comments to explain what each utility does
   - Group related utilities together (layout, typography, animations)
   - Use TypeScript for better autocomplete and error catching

### Step 4: Migration Path for SCSS Files

#### Understanding the Migration Process

Migrating from SCSS to Emotion is a systematic process that involves understanding the original styles and recreating them in Emotion's syntax. Here's a detailed step-by-step approach:

1. **Analyze the SCSS file**: Understand the styling patterns and component relationships
2. **Create a parallel Emotion file**: Create a new `.styles.ts` file alongside the existing component
3. **Convert selectors to emotion styles**: Translate SCSS selectors and rules to Emotion's syntax
4. **Update component imports**: Modify the component to use the new Emotion styles
5. **Test visual equivalence**: Verify the component looks identical after conversion
6. **Remove the SCSS file**: Once testing confirms correctness, remove the original SCSS file

#### Complete Migration Example

Let's walk through a complete example with detailed comments:

**Original Files:**

```scss
/* button.scss */
.custom-button {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background-color: #006BB4;
  color: white;
  border-radius: 4px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #005093;
  }
  
  &__icon {
    margin-right: 8px;
  }
  
  &__text {
    font-weight: 500;
  }
  
  &--secondary {
    background-color: #f5f7fa;
    color: #006BB4;
    border: 1px solid #006BB4;
    
    &:hover {
      background-color: #e6ebf2;
    }
  }
}

// For responsive design
@media (max-width: 767px) {
  .custom-button {
    padding: 6px 12px;
    
    &__icon {
      margin-right: 4px;
    }
  }
}
```

```tsx
// Button.tsx (before migration)
import React from 'react';
import './button.scss';

interface ButtonProps {
  text: string;
  icon?: React.ReactNode;
  secondary?: boolean;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({ 
  text, 
  icon, 
  secondary = false,
  onClick 
}) => {
  return (
    <button 
      className={`custom-button ${secondary ? 'custom-button--secondary' : ''}`}
      onClick={onClick}
    >
      {icon && <span className="custom-button__icon">{icon}</span>}
      <span className="custom-button__text">{text}</span>
    </button>
  );
};
```

**Migrated Files:**

```tsx
// button.styles.ts
import { css } from '@emotion/react';
import { mediaQueries } from '../../theme/emotion_utils';

// Base button styles 
export const buttonStyles = {
  // Main button container
  button: css`
    display: flex;
    align-items: center;
    padding: 8px 16px;
    background-color: ${({theme}) => theme.colors.primary};
    color: white;
    border-radius: 4px;
    transition: background-color 0.2s;
    
    &:hover {
      background-color: ${({theme}) => theme.colors.primaryDark || '#005093'};
    }
    
    // Responsive styles
    ${mediaQueries.small} {
      padding: 6px 12px;
    }
  `,
  
  // Secondary variant
  secondaryButton: css`
    background-color: ${({theme}) => theme.colors.lightShade || '#f5f7fa'};
    color: ${({theme}) => theme.colors.primary};
    border: 1px solid ${({theme}) => theme.colors.primary};
    
    &:hover {
      background-color: ${({theme}) => theme.colors.lightestShade || '#e6ebf2'};
    }
  `,
  
  // Icon styles
  icon: css`
    margin-right: 8px;
    
    ${mediaQueries.small} {
      margin-right: 4px;
    }
  `,
  
  // Text styles
  text: css`
    font-weight: 500;
  `
};
```

```tsx
// Button.tsx (after migration)
import React from 'react';
import { css } from '@emotion/react';
import { buttonStyles } from './button.styles';

interface ButtonProps {
  text: string;
  icon?: React.ReactNode;
  secondary?: boolean;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({ 
  text, 
  icon, 
  secondary = false,
  onClick 
}) => {
  return (
    <button 
      css={css`
        ${buttonStyles.button}
        ${secondary && buttonStyles.secondaryButton}
      `}
      onClick={onClick}
    >
      {icon && <span css={buttonStyles.icon}>{icon}</span>}
      <span css={buttonStyles.text}>{text}</span>
    </button>
  );
};
```

#### Side-by-Side Comparison of Key Patterns

| SCSS Pattern | Emotion Equivalent | Notes |
|--------------|-------------------|-------|
| `.class-name` | `css\` styled string or style object | Instead of class names, use the `css` prop or style objects |
| `&__element` | Separate style object property | BEM selectors become individual named styles |
| `&--modifier` | Conditional style application | Use composition with conditional logic |
| `@media queries` | Either use mediaQueries utility or inline | Can be included directly in the style definition |
| Variables: `$var` | Theme properties & JS variables | Use theme object properties or regular JS variables |
| Nesting: `.parent .child` | Compose with `&` selector | Use the `&` selector for nesting, just like in SCSS |

#### For Junior Engineers: Migration Workflow

**1. Preparing for migration:**

* **Create a checklist** for each SCSS file you're migrating
* **Identify dependencies** - look for imports, variables, mixins used in the file
* **Take screenshots** of the component in different states for visual comparison

**2. The migration process:**

* **Start with a clean TypeScript file** named `[component].styles.ts`
* **Import the necessary utilities**:
  ```tsx
  import { css } from '@emotion/react';
  import { mediaQueries, commonStyles } from '../../theme/emotion_utils';
  ```
* **Create a styles object** with named properties for each element
* **Convert SCSS rules one by one**, focusing on matching the original styles
* **Replace hardcoded values** with theme values where appropriate
* **Test each style** as you add it to ensure it works correctly

**3. Common migration challenges:**

* **Handling global styles**: Use the Emotion `Global` component
* **SCSS mixins**: Convert to utility functions
* **Complex selectors**: Break into smaller, composable parts
* **Theme variables**: Replace with theme properties

**4. Tips for successful migration:**

* **Start small**: Choose simple components first
* **Work feature by feature**: Complete one area before moving to the next
* **Create a migration guide**: Document patterns and solutions for the team
* **Pair program**: Work with an experienced engineer on your first few migrations
* **Visual regression testing**: Implement tests to catch styling changes

#### Prioritization Strategy

- **Start with high-impact, frequently used components**
- **Migrate one plugin or feature area at a time**
- **Focus on components with simple styling first**
- **Create a dependency graph** to identify components that should be migrated together

### Step 5: Handle Styled Components Migration

#### Understanding the Migration Context

While Emotion and styled-components have similar APIs, there are some key differences that need to be considered during migration. This section focuses specifically on the Observability plugins and other areas where styled-components is currently in use.

#### Migration Approaches

There are two main approaches to migrating from styled-components to Emotion:

1. **Direct API migration**: Convert from styled-components API to Emotion's `styled` API
2. **Full conversion to css prop**: Convert to Emotion's `css` prop approach

#### Approach 1: Direct API Migration (Minimal Changes)

For codebases heavily using styled-components, this approach causes minimal disruption:

**Before (styled-components):**

```tsx
// DataPanel.tsx
import styled from 'styled-components';

// Create styled components
const Container = styled.div`
  background: ${props => props.theme.colors.background};
  padding: ${props => props.theme.euiSize};
  border-radius: ${props => props.theme.euiBorderRadius};
  box-shadow: ${props => props.isDarkMode ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'};
`;

const Title = styled.h2`
  color: ${props => props.theme.colors.title};
  font-size: 18px;
  margin-bottom: ${props => props.theme.euiSizeS};
`;

const Content = styled.div`
  max-height: 400px;
  overflow-y: auto;
  
  // Nested selector example
  & > p {
    margin-bottom: ${props => props.theme.euiSizeS};
  }
`;

// Use in component
const DataPanel = ({ title, children, isDarkMode }) => (
  <Container isDarkMode={isDarkMode}>
    <Title>{title}</Title>
    <Content>{children}</Content>
  </Container>
);
```

**After (Emotion styled API):**

```tsx
// DataPanel.tsx
import styled from '@emotion/styled';

// Create styled components with Emotion
const Container = styled.div`
  background: ${props => props.theme.colors.background};
  padding: ${props => props.theme.euiSize};
  border-radius: ${props => props.theme.euiBorderRadius};
  box-shadow: ${props => props.isDarkMode ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'};
`;

const Title = styled.h2`
  color: ${props => props.theme.colors.title};
  font-size: 18px;
  margin-bottom: ${props => props.theme.euiSizeS};
`;

const Content = styled.div`
  max-height: 400px;
  overflow-y: auto;
  
  // Nested selector example
  & > p {
    margin-bottom: ${props => props.theme.euiSizeS};
  }
`;

// Use in component (unchanged)
const DataPanel = ({ title, children, isDarkMode }) => (
  <Container isDarkMode={isDarkMode}>
    <Title>{title}</Title>
    <Content>{children}</Content>
  </Container>
);
```

**Key Differences to Watch For:**

* Import changes from `styled-components` to `@emotion/styled`
* Different theme property access if your theme structure changes
* Different behavior with composition and nesting (though usually compatible)

#### Approach 2: Full Conversion to CSS Prop

For a more idiomatic Emotion approach, convert to the `css` prop pattern:

```tsx
// DataPanel.tsx
import { css } from '@emotion/react';
import { useTheme } from '@emotion/react';

// Define styles as objects or functions
const getContainerStyles = (isDarkMode) => {
  const theme = useTheme();
  return css`
    background: ${theme.colors.background};
    padding: ${theme.euiSize};
    border-radius: ${theme.euiBorderRadius};
    box-shadow: ${isDarkMode ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'};
  `;
};

const titleStyles = css`
  color: ${({theme}) => theme.colors.title};
  font-size: 18px;
  margin-bottom: ${({theme}) => theme.euiSizeS};
`;

const contentStyles = css`
  max-height: 400px;
  overflow-y: auto;
  
  & > p {
    margin-bottom: ${({theme}) => theme.euiSizeS};
  }
`;

// Use in component with css prop
const DataPanel = ({ title, children, isDarkMode }) => {
  return (
    <div css={getContainerStyles(isDarkMode)}>
      <h2 css={titleStyles}>{title}</h2>
      <div css={contentStyles}>{children}</div>
    </div>
  );
};
```

#### Handling Dynamic Props with Emotion

One common pattern in styled-components is handling dynamic props. Here's how to handle this with Emotion:

**styled-components way:**

```tsx
const StyledButton = styled.button`
  background: ${props => props.primary ? 'blue' : 'gray'};
  color: white;
  font-size: ${props => props.large ? '18px' : '14px'};
`;

<StyledButton primary large>Click me</StyledButton>
```

**Emotion css prop way:**

```tsx
const getButtonStyles = (primary, large) => css`
  background: ${primary ? 'blue' : 'gray'};
  color: white;
  font-size: ${large ? '18px' : '14px'};
`;

<button css={getButtonStyles(true, true)}>Click me</button>
```

**Emotion styled API way (most similar to styled-components):**

```tsx
const StyledButton = styled.button`
  background: ${props => props.primary ? 'blue' : 'gray'};
  color: white;
  font-size: ${props => props.large ? '18px' : '14px'};
`;

<StyledButton primary large>Click me</StyledButton>
```

#### For Junior Engineers: Migration Tips

**1. Understanding the similarities and differences:**

* Both libraries use tagged template literals for styling
* Emotion's `styled` API is nearly identical to styled-components
* The `css` prop is unique to Emotion and provides more flexibility

**2. Step-by-step migration process:**

* **Step 1:** Install Emotion dependencies if not already present
  ```bash
  npm install @emotion/react @emotion/styled
  ```

* **Step 2:** Update imports
  ```tsx
  // Before
  import styled from 'styled-components';
  import { ThemeProvider } from 'styled-components';
  
  // After
  import styled from '@emotion/styled';
  import { ThemeProvider } from '@emotion/react';
  ```

* **Step 3:** Update theme access if necessary
  ```tsx
  // Check if theme structure differs between styled-components and Emotion
  const color = props => props.theme.colors.primary;
  ```

* **Step 4:** Test each component after migration

**3. Common challenges:**

* **Theme access differences**: Ensure the theme structure is compatible
* **Global styles**: Replace styled-components' `createGlobalStyle` with Emotion's `Global` component
* **Server-side rendering**: Update SSR setup if your app uses it
* **TypeScript types**: Update type definitions for styled components

**4. Choose your migration strategy:**

* **One component at a time**: Safest but can lead to mixed usage
* **One module at a time**: Convert related components together
* **Big bang approach**: Convert all at once (risky but clean)

**5. Testing your migration:**

* Visual comparison of components before and after
* Verify theme application in both light and dark modes
* Check responsive behavior across screen sizes
* Verify interactive states (hover, focus, active)

### Step 6: EUI and Emotion Integration

#### Understanding the Integration Challenge

EUI (Elastic UI Framework) already provides a robust set of styled components. The goal is not to replace EUI, but to enhance it with Emotion when needed for custom styling beyond what EUI provides out of the box.

#### Integration Patterns

**1. Basic EUI Component Styling**

Use the `css` prop to add custom styles to EUI components:

```tsx
import { css } from '@emotion/react';
import { EuiButton, EuiButtonProps } from '@elastic/eui';

interface CustomButtonProps extends EuiButtonProps {
  isSpecial?: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({ isSpecial, ...rest }) => (
  <EuiButton
    css={css`
      // Custom styles that extend EUI styling
      transition: all 0.2s ease;
      
      ${isSpecial && `
        background-image: linear-gradient(to right, #6157ff, #74f2ce);
        color: white;
        border: none;
      `}
      
      &:hover {
        transform: scale(1.02);
      }
    `}
    {...rest}
  />
);
```

**2. Creating Composite Components**

Wrapping multiple EUI components with custom layouts:

```tsx
import { css } from '@emotion/react';
import { EuiCard, EuiIcon, EuiText, EuiSpacer } from '@elastic/eui';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  onClick?: () => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon, onClick }) => (
  <EuiCard
    css={css`
      height: 100%;
      transition: box-shadow 0.2s ease, transform 0.2s ease;
      
      &:hover {
        box-shadow: ${({ theme }) => theme.kibana.panels.boxShadow};
        transform: translateY(-2px);
      }
    `}
    title={title}
    description=""
    onClick={onClick}
    paddingSize="l"
  >
    <div
      css={css`
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      `}
    >
      <EuiIcon
        type={icon}
        size="xl"
        css={css`
          margin-bottom: ${({ theme }) => theme.euiSizeM};
        `}
      />
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>{description}</p>
      </EuiText>
    </div>
  </EuiCard>
);
```

**3. Theme-Aware Styling**

Creating styles that adapt to the EUI theme:

```tsx
import { css } from '@emotion/react';
import { EuiPanel, useEuiTheme } from '@elastic/eui';

const ThemedPanel = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  
  return (
    <EuiPanel
      css={css`
        // Access the current EUI theme values
        border-left: 3px solid ${euiTheme.colors.primary};
        background-color: ${euiTheme.colors.lightShade};
        transition: all 0.2s ease;
        
        // Use CSS custom properties from EUI
        padding: var(--euiSize);
        border-radius: var(--euiBorderRadius);
      `}
    >
      {children}
    </EuiPanel>
  );
};
```

#### Creating Reusable EUI Extensions

Create a library of common EUI extensions for consistency:

```tsx
// src/core/public/theme/eui_extensions.ts
import { css } from '@emotion/react';

export const euiExtensions = {
  // Make any EUI component full width
  fullWidth: css`
    width: 100%;
  `,
  
  // Add subtle hover effect to EUI cards
  cardHoverEffect: css`
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: ${({ theme }) => theme.kibana.panels.boxShadow};
    }
  `,
  
  // Add animation to EUI components
  fadeIn: css`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    animation: fadeIn 0.3s ease-in-out;
  `,
  
  // Custom EUI button styles
  primaryActionButton: css`
    min-width: 120px;
    justify-content: center;
    font-weight: 500;
  `,
};
```

#### For Junior Engineers: Working with EUI and Emotion

**1. Understanding EUI's Design System**

* EUI already has a complete theme system
* It provides spacing, colors, typography, and components
* Learn the EUI system before adding custom styles

**2. When to use custom styling**

* **Do use Emotion** when you need to:
  * Create custom layouts not provided by EUI
  * Add animations or transitions
  * Create composite components
  * Implement custom designs that extend beyond EUI's patterns

* **Don't use Emotion** when:
  * EUI already provides the styling you need
  * You're trying to override EUI's core styles (use props instead)
  * You're creating completely custom components (consider if EUI has an equivalent)

**3. Practical Tips**

* Use the EUI documentation to find available props before adding custom CSS
* Leverage EUI's theme variables when possible
* Create reusable style patterns for common customizations
* Be careful not to override essential EUI styles that may affect accessibility

**4. Debugging EUI with Emotion**

* Use browser developer tools to inspect EUI components
* Look at the CSS generated by EUI to understand how to extend it
* When extending EUI styles, be mindful of specificity issues

#### Documentation Example

Create a documentation entry for each custom extension:

```md
## EUI Card with Hover Effect

Enhanced EUI Card with a subtle hover effect and animation.

### Usage

```tsx
import { EuiCard } from '@elastic/eui';
import { euiExtensions } from '../../theme/eui_extensions';
import { css } from '@emotion/react';

<EuiCard
  title="My Card"
  description="Description"
  css={css`
    ${euiExtensions.cardHoverEffect}
    ${euiExtensions.fadeIn}
  `}
/>
```

### Result

- Card subtly elevates on hover
- Smooth fade-in animation on mount
```

### Step 7: Create Migration Tooling

#### Why Build Migration Tools?

Migrating a large codebase from multiple CSS approaches to Emotion can be repetitive and error-prone. Custom tooling can accelerate the process and ensure consistency. This section outlines practical tools to support the migration effort.

#### Migration CLI Tool Concept

The migration tooling should combine automated conversion with analysis capabilities:

```typescript
// scripts/css-migration/index.ts

import { Command } from 'commander';
import { analyzeUsage } from './analyze';
import { convertScssToEmotion } from './converter';
import { trackMigrationProgress } from './tracker';

const program = new Command();

program
  .name('css-migration')
  .description('Tools for migrating CSS in Kibana to Emotion')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze CSS usage in the codebase')
  .option('-d, --dir <directory>', 'Directory to analyze', '/Users/pickypg/dev/elastic/kibana/src')
  .option('-o, --output <file>', 'Output file for analysis report', 'css-analysis.json')
  .action(async (options) => {
    await analyzeUsage(options.dir, options.output);
  });

program
  .command('convert')
  .description('Convert SCSS files to Emotion')
  .option('-f, --file <file>', 'SCSS file to convert')
  .option('-d, --dir <directory>', 'Directory containing SCSS files to convert')
  .option('--dry-run', 'Show conversion without writing files', false)
  .action(async (options) => {
    await convertScssToEmotion(options.file, options.dir, options.dryRun);
  });

program
  .command('track')
  .description('Track migration progress')
  .option('-d, --dir <directory>', 'Directory to track', '/Users/pickypg/dev/elastic/kibana/src')
  .action(async (options) => {
    await trackMigrationProgress(options.dir);
  });

program.parse();
```

#### Analysis Tool Implementation

Scanning the codebase to understand the current CSS usage and identify migration priorities:

```typescript
// scripts/css-migration/analyze.ts

import fs from 'fs/promises';
import path from 'path';
import glob from 'glob';

interface AnalysisResult {
  totalFiles: number;
  cssFrameworks: {
    scss: number;
    emotion: number;
    styledComponents: number;
    plainCss: number;
  };
  highImpactFiles: string[];
  dependencies: Record<string, string[]>;
}

export async function analyzeUsage(directory: string, outputFile: string): Promise<void> {
  console.log(`Analyzing CSS usage in ${directory}...`);
  
  const result: AnalysisResult = {
    totalFiles: 0,
    cssFrameworks: {
      scss: 0,
      emotion: 0,
      styledComponents: 0,
      plainCss: 0,
    },
    highImpactFiles: [],
    dependencies: {},
  };
  
  // Example implementation of scanning for different CSS approaches
  const files = glob.sync(`${directory}/**/*.{ts,tsx,js,jsx,scss,css}`);
  result.totalFiles = files.length;
  
  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    
    // Count framework usage
    if (file.endsWith('.scss')) {
      result.cssFrameworks.scss++;
    } else if (file.endsWith('.css')) {
      result.cssFrameworks.plainCss++;
    } else {
      // Check for imports in JS/TS files
      if (content.includes('@emotion/react') || content.includes('@emotion/css')) {
        result.cssFrameworks.emotion++;
      }
      if (content.includes('styled-components')) {
        result.cssFrameworks.styledComponents++;
      }
    }
    
    // Identify high-impact files based on import count
    const importCount = (content.match(/import/g) || []).length;
    if (importCount > 10 && (file.endsWith('.scss') || file.endsWith('.css'))) {
      result.highImpactFiles.push(file);
    }
    
    // Build dependency graph
    if (!file.endsWith('.scss') && !file.endsWith('.css')) {
      const styleImports = findStyleImports(content);
      if (styleImports.length) {
        result.dependencies[file] = styleImports;
      }
    }
  }
  
  // Generate visualization data
  const visualization = {
    labels: ['SCSS', 'Emotion', 'Styled Components', 'Plain CSS'],
    data: [
      result.cssFrameworks.scss,
      result.cssFrameworks.emotion,
      result.cssFrameworks.styledComponents,
      result.cssFrameworks.plainCss,
    ],
  };
  
  // Save analysis results
  await fs.writeFile(
    outputFile,
    JSON.stringify({ ...result, visualization }, null, 2)
  );
  
  console.log(`Analysis complete. Results saved to ${outputFile}`);
  console.log(`Summary:`);
  console.log(`- SCSS files: ${result.cssFrameworks.scss}`);
  console.log(`- Files using Emotion: ${result.cssFrameworks.emotion}`);
  console.log(`- Files using Styled Components: ${result.cssFrameworks.styledComponents}`);
  console.log(`- Plain CSS files: ${result.cssFrameworks.plainCss}`);
  console.log(`- High impact files: ${result.highImpactFiles.length}`);
}

function findStyleImports(content: string): string[] {
  // Implementation to extract style imports
  const imports: string[] = [];
  const regex = /import.*from\s+['"](.*\.(?:scss|css))['"];/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}
```

#### Conversion Tool Example

A tool to help convert SCSS to Emotion:

```typescript
// scripts/css-migration/converter.ts

import fs from 'fs/promises';
import path from 'path';
import glob from 'glob';
import postcss from 'postcss';
import scss from 'postcss-scss';

interface ConversionOptions {
  file?: string;
  directory?: string;
  dryRun: boolean;
}

export async function convertScssToEmotion(
  file?: string,
  directory?: string,
  dryRun = false
): Promise<void> {
  if (!file && !directory) {
    throw new Error('Either file or directory must be specified');
  }
  
  const filesToProcess: string[] = [];
  
  if (file) {
    filesToProcess.push(file);
  }
  
  if (directory) {
    const scssFiles = glob.sync(`${directory}/**/*.scss`);
    filesToProcess.push(...scssFiles);
  }
  
  console.log(`Converting ${filesToProcess.length} SCSS files to Emotion...`);
  
  for (const scssFile of filesToProcess) {
    await convertFile(scssFile, dryRun);
  }
  
  console.log('Conversion complete!');
}

async function convertFile(filePath: string, dryRun: boolean): Promise<void> {
  console.log(`Processing ${filePath}...`);
  
  const content = await fs.readFile(filePath, 'utf-8');
  const emotionStyles = await scssToEmotion(content, path.basename(filePath, '.scss'));
  
  const outputPath = filePath.replace(/\.scss$/, '.styles.ts');
  
  if (dryRun) {
    console.log('Generated Emotion styles:');
    console.log(emotionStyles);
  } else {
    await fs.writeFile(outputPath, emotionStyles);
    console.log(`Wrote Emotion styles to ${outputPath}`);
  }
}

async function scssToEmotion(scss: string, componentName: string): Promise<string> {
  // Simplified implementation - a full implementation would need to parse SCSS AST
  const styles: Record<string, string> = {};
  
  // For demonstration - actual implementation would be more complex
  const rootClassName = findRootClassName(scss);
  if (rootClassName) {
    styles.container = extractStyles(scss, rootClassName);
    
    // Extract nested selectors
    const nestedSelectors = findNestedSelectors(scss, rootClassName);
    for (const selector of nestedSelectors) {
      const name = selectorToStyleName(selector, rootClassName);
      styles[name] = extractStyles(scss, selector);
    }
  }
  
  // Generate Emotion styles file
  return generateEmotionFile(styles, componentName);
}

// Helper functions (simplified for demonstration)
function findRootClassName(scss: string): string {
  const match = scss.match(/^\.(\w+)\s*\{/m);
  return match ? match[1] : '';
}

function findNestedSelectors(scss: string, rootClass: string): string[] {
  // In a real implementation, this would be more robust
  const selectors: string[] = [];
  const nestedPattern = new RegExp(`\\.${rootClass}__([\\w-]+)`, 'g');
  let match;
  
  while ((match = nestedPattern.exec(scss)) !== null) {
    selectors.push(`${rootClass}__${match[1]}`);
  }
  
  return selectors;
}

function selectorToStyleName(selector: string, rootClass: string): string {
  return selector.replace(`${rootClass}__`, '');
}

function extractStyles(scss: string, selector: string): string {
  // In a real implementation, this would parse the SCSS AST
  // For demonstration, we'll just return placeholder styles
  return 'display: flex; /* Placeholder for extracted styles */';
}

function generateEmotionFile(styles: Record<string, string>, componentName: string): string {
  const camelCaseName = componentName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  
  let output = `import { css } from '@emotion/react';

export const ${camelCaseName}Styles = {\n`;
  
  for (const [name, style] of Object.entries(styles)) {
    output += `  ${name}: css\`\n    ${style}\n  \`,\n`;
  }
  
  output += '};
';
  
  return output;
}
```

#### Migration Progress Tracking

A tool to track and visualize migration progress across the codebase:

```typescript
// scripts/css-migration/tracker.ts

import fs from 'fs/promises';
import path from 'path';
import glob from 'glob';

interface ProgressData {
  date: string;
  metrics: {
    totalComponents: number;
    migratedComponents: number;
    percentComplete: number;
    byFramework: {
      scss: number;
      emotion: number;
      styledComponents: number;
      plainCss: number;
    };
    byDirectory: Record<string, {
      total: number;
      migrated: number;
      percentComplete: number;
    }>;
  };
}

export async function trackMigrationProgress(directory: string): Promise<void> {
  console.log(`Tracking migration progress in ${directory}...`);
  
  const metrics = await calculateMetrics(directory);
  
  const progressData: ProgressData = {
    date: new Date().toISOString(),
    metrics,
  };
  
  // Save progress data
  const progressFile = 'migration-progress.json';
  let history: ProgressData[] = [];
  
  try {
    const existing = await fs.readFile(progressFile, 'utf-8');
    history = JSON.parse(existing);
  } catch (error) {
    // File doesn't exist yet, starting fresh
  }
  
  history.push(progressData);
  await fs.writeFile(progressFile, JSON.stringify(history, null, 2));
  
  // Generate report
  await generateReport(progressData, history);
  
  console.log('Progress tracking complete!');
  console.log(`Overall progress: ${metrics.percentComplete.toFixed(2)}%`);
}

async function calculateMetrics(directory: string) {
  // Simplified implementation
  const allComponents = glob.sync(`${directory}/**/*.{tsx,jsx}`);
  const emotionComponents = glob.sync(`${directory}/**/*.{tsx,jsx}`).
    filter(file => isUsingEmotion(file));
  
  // Get directory breakdown
  const byDirectory: Record<string, { total: number; migrated: number; percentComplete: number }> = {};
  const topLevelDirs = await getTopLevelDirectories(directory);
  
  for (const dir of topLevelDirs) {
    const dirPath = path.join(directory, dir);
    const dirComponents = glob.sync(`${dirPath}/**/*.{tsx,jsx}`);
    const dirEmotionComponents = dirComponents.filter(file => isUsingEmotion(file));
    
    byDirectory[dir] = {
      total: dirComponents.length,
      migrated: dirEmotionComponents.length,
      percentComplete: dirComponents.length ? 
        (dirEmotionComponents.length / dirComponents.length) * 100 : 0
    };
  }
  
  return {
    totalComponents: allComponents.length,
    migratedComponents: emotionComponents.length,
    percentComplete: allComponents.length ? 
      (emotionComponents.length / allComponents.length) * 100 : 0,
    byFramework: {
      scss: countFiles(directory, '**/*.scss'),
      emotion: emotionComponents.length,
      styledComponents: countStyledComponentsUsage(directory),
      plainCss: countFiles(directory, '**/*.css'),
    },
    byDirectory,
  };
}

async function generateReport(current: ProgressData, history: ProgressData[]): Promise<void> {
  // Generate HTML report with charts
  const reportHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>CSS Migration Progress</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .chart-container { height: 400px; margin-bottom: 40px; }
        .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f5f7fa; border-radius: 4px; padding: 20px; text-align: center; }
        .metric h3 { margin-top: 0; }
        .metric .value { font-size: 2em; font-weight: bold; color: #006BB4; }
        h1, h2 { color: #343741; }
      </style>
    </head>
    <body>
      <h1>CSS Migration Progress</h1>
      <p>Last updated: ${new Date(current.date).toLocaleString()}</p>
      
      <div class="metrics">
        <div class="metric">
          <h3>Total Components</h3>
          <div class="value">${current.metrics.totalComponents}</div>
        </div>
        <div class="metric">
          <h3>Migrated to Emotion</h3>
          <div class="value">${current.metrics.migratedComponents}</div>
        </div>
        <div class="metric">
          <h3>Progress</h3>
          <div class="value">${current.metrics.percentComplete.toFixed(1)}%</div>
        </div>
        <div class="metric">
          <h3>Remaining SCSS Files</h3>
          <div class="value">${current.metrics.byFramework.scss}</div>
        </div>
      </div>
      
      <h2>Overall Progress</h2>
      <div class="chart-container">
        <canvas id="progressChart"></canvas>
      </div>
      
      <h2>CSS Usage Breakdown</h2>
      <div class="chart-container">
        <canvas id="frameworkChart"></canvas>
      </div>
      
      <h2>Progress by Directory</h2>
      <div class="chart-container">
        <canvas id="directoryChart"></canvas>
      </div>
      
      <script>
        // Simplified chart initialization
        const progressCtx = document.getElementById('progressChart').getContext('2d');
        const frameworkCtx = document.getElementById('frameworkChart').getContext('2d');
        const directoryCtx = document.getElementById('directoryChart').getContext('2d');
        
        // Progress chart
        new Chart(progressCtx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(history.map(h => new Date(h.date).toLocaleDateString()))},
            datasets: [{
              label: 'Migration Progress (%)',
              data: ${JSON.stringify(history.map(h => h.metrics.percentComplete))},
              borderColor: '#006BB4',
              backgroundColor: 'rgba(0, 107, 180, 0.1)',
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
          }
        });
        
        // Framework breakdown chart
        new Chart(frameworkCtx, {
          type: 'pie',
          data: {
            labels: ['SCSS', 'Emotion', 'Styled Components', 'Plain CSS'],
            datasets: [{
              data: [
                ${current.metrics.byFramework.scss},
                ${current.metrics.byFramework.emotion},
                ${current.metrics.byFramework.styledComponents},
                ${current.metrics.byFramework.plainCss}
              ],
              backgroundColor: ['#FA744E', '#00BFB3', '#FECD2F', '#D3DAE6']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
          }
        });
        
        // Directory progress chart
        new Chart(directoryCtx, {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(Object.keys(current.metrics.byDirectory))},
            datasets: [{
              label: 'Progress (%)',
              data: ${JSON.stringify(Object.values(current.metrics.byDirectory).map(d => d.percentComplete))},
              backgroundColor: '#00BFB3'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                max: 100
              }
            }
          }
        });
      </script>
    </body>
    </html>
  `;
  
  await fs.writeFile('migration-report.html', reportHtml);
  console.log('Generated progress report: migration-report.html');
}

// Helper functions (simplified for demonstration)
function isUsingEmotion(filePath: string): boolean {
  // In a real implementation, this would check file contents
  return Math.random() > 0.5; // Placeholder for demonstration
}

async function getTopLevelDirectories(directory: string): Promise<string[]> {
  const dirs = await fs.readdir(directory);
  const result: string[] = [];
  
  for (const dir of dirs) {
    const stat = await fs.stat(path.join(directory, dir));
    if (stat.isDirectory()) {
      result.push(dir);
    }
  }
  
  return result;
}

function countFiles(directory: string, pattern: string): number {
  return glob.sync(path.join(directory, pattern)).length;
}

function countStyledComponentsUsage(directory: string): number {
  // In a real implementation, this would scan file contents
  return Math.floor(Math.random() * 100); // Placeholder for demonstration
}
```

#### Example CLI Usage

```bash
# Generate analysis of the current CSS usage
node scripts/css-migration.js analyze --dir=/Users/pickypg/dev/elastic/kibana/src/plugins

# Convert a single SCSS file to Emotion
node scripts/css-migration.js convert --file=/Users/pickypg/dev/elastic/kibana/src/plugins/dashboard/public/styles/index.scss

# Convert all SCSS files in a directory
node scripts/css-migration.js convert --dir=/Users/pickypg/dev/elastic/kibana/src/plugins/dashboard

# Track migration progress
node scripts/css-migration.js track
```

#### For Junior Engineers: Using the Migration Tools

**1. Getting Started with the Tool**

* Install the necessary dependencies:
  ```bash
  npm install glob postcss postcss-scss commander
  ```

* Set up TypeScript compilation for the scripts:
  ```bash
  tsc scripts/css-migration/*.ts --outDir dist/scripts
  ```

* Run the tools from the project root:
  ```bash
  node dist/scripts/css-migration/index.js analyze
  ```

**2. Analyzing Before Migrating**

* Always run the analysis tool first to understand what you're working with
* Review the generated report to identify high-impact files
* Look for patterns of related files that should be migrated together

**3. Using the Conversion Tool Effectively**

* Start with a dry run to see what the tool will generate:
  ```bash
  node scripts/css-migration.js convert --file=path/to/file.scss --dry-run
  ```

* Review the generated output carefully
* Make any necessary adjustments to the generated code
* Remember that not all SCSS features can be automatically converted

**4. Tracking Progress**

* Run the tracking tool after each migration milestone
* Use the reports to communicate progress to the team
* Set goals based on the metrics and prioritize accordingly

**5. Customizing the Tool for Your Needs**

* The examples provided are a starting point
* Customize the tools based on your codebase's specific patterns
* Add project-specific rules and validation

#### Benefits of the Tooling Approach

- **Consistency**: Ensures a standardized approach to conversion
- **Efficiency**: Automates repetitive parts of the migration
- **Visibility**: Provides clear metrics on progress
- **Documentation**: Helps document the migration patterns
- **Training**: Serves as a learning tool for the team

## Handling Challenges

### Global Styles
Use the Emotion `Global` component for resets and base styles:

```tsx
import { Global, css } from '@emotion/react';

const GlobalStyles = () => (
  <Global
    styles={css`
      html, body {
        margin: 0;
        padding: 0;
      }
      /* Other global styles */
    `}
  />
);
```

### CSS Variables
Convert CSS variables to theme values:

```tsx
// Before: CSS variables
:root {
  --primary-color: #006BB4;
}
.component {
  color: var(--primary-color);
}

// After: Emotion theme
const theme = {
  colors: {
    primary: '#006BB4',
  },
};

const Component = () => (
  <div css={css`
    color: ${({ theme }) => theme.colors.primary};
  `}>
    Content
  </div>
);
```

### Specificity Issues
Use Emotion's composition to manage style precedence:

```tsx
const baseStyles = css`
  color: blue;
`;

const overrideStyles = css`
  ${baseStyles}
  color: red; /* This will take precedence */
`;
```

## Migration Timeline and Tracking

1. **Preparation Phase (1-2 months)**
   - Set up centralized theme
   - Create utility components
   - Document patterns and guidelines

2. **Pilot Phase (1 month)**
   - Select a small plugin or feature area
   - Complete full migration
   - Document lessons learned

3. **Scaling Phase (3-6 months)**
   - Migrate high-impact components
   - Convert styled-components in Observability plugins
   - Build migration tooling

4. **Completion Phase (6-12 months)**
   - Migrate remaining components
   - Enforce new standards in code reviews
   - Remove redundant CSS libraries

## Success Metrics

Track the following metrics to measure migration progress:

1. **Percentage of components using Emotion**
2. **Reduction in SCSS file count**
3. **Bundle size reduction**
4. **Styled-components usage reduction**
5. **Developer satisfaction surveys**

## Developer Resources

- [Emotion Documentation](https://emotion.sh/docs/introduction)
- [Emotion TypeScript Guide](https://emotion.sh/docs/typescript)
- [EUI Documentation](https://elastic.github.io/eui/)
- [Internal Migration Guidelines (to be created)]
