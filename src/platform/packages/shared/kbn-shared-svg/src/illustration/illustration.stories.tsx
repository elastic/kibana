/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiPageTemplate,
  EuiProvider,
  EuiText,
  EuiCodeBlock,
  EuiSpacer,
} from '@elastic/eui';
import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Illustration } from './illustration';
import { IllustrationEuiColors } from './assets';

export default {
  title: 'Illustration/Adaptive Illustrations',
  component: Illustration,
  argTypes: {
    theme: {
      control: 'select',
      options: ['amsterdam', 'borealis'],
      defaultValue: 'amsterdam',
    },
    mode: {
      control: 'select',
      options: ['light', 'dark'],
      defaultValue: 'light',
    },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      page: () => (
        <>
          <EuiProvider>
            <Docs />
          </EuiProvider>
        </>
      ),
    },
  },
} as ComponentMeta<typeof Illustration>;

export const AdaptiveIllustrations: ComponentStory<typeof Illustration> = (args) => {
  return (
    <div style={{ backgroundColor: args.mode === 'light' ? '#FFF' : '#000' }}>
      <IllustrationEuiColors {...args} />
      <EuiFlexGroup alignItems="center" justifyContent="center" direction="row">
        <EuiFlexItem>
          <Illustration {...args} name="dashboards" />
        </EuiFlexItem>
        <EuiFlexItem>
          <Illustration {...args} name="no_results" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

const Intro = () => (
  <EuiMarkdownFormat textSize="m">{`
For any given illustration in Kibana, we maintain two discrete files: one for light mode, and one for dark mode.  With the introduction of the Borealis theme, we would theoretically need to maintain _four_ versions of each illustration.

By using CSS variables with approriate fallbacks embedded in a single SVG, we can adapt the colors of the SVG to both the theme and color mode of Kibana.  This will allow us to reduce the number of SVGs we need to maintain, and provide a more consistent UX between themes and color modes.

This is a proof-of-concept which uses a single SVG file and a JSON file of tokens and their color values.  These are both read by a React component-- \`Illustration\`-- which compiles the color profile and adds the SVG to the DOM.
`}</EuiMarkdownFormat>
);

const Summary = () => (
  <EuiMarkdownFormat textSize="relative">
    {`
## Summary

- Define CSS variables for EUI theme colors, available globally on the \`:root\`.
- Create a single SVG file
  - replace any \`fill\` attribute with a \`style\` attribute using a CSS variable and fallback HEX color.
- Create a color profile JSON file
  - enumerate all variables and their color values.
  - define common, light, dark, as well as thematic common, light and dark colors.
  - if a variable uses a color from the EUI palette, use that variable.
  - use RGB subtraction to calculate color shifts in non-EUI colors.
- Render the SVG.
  - render the SVG inline.
  - calculate styles to apply to the SVG based on the theme and color mode and values from the JSON file.
  - apply the CSS variables to the \`:root\` based on the theme and color mode, using \`Global\` from \`@emotion/react\`.

  `}
  </EuiMarkdownFormat>
);

const Background = () => (
  <EuiMarkdownFormat textSize="relative">
    {`
  ## Background

  Today, our illustrations are produced in two color modes: light and dark.  The developer is resposible for shifting between the two images based on the color mode of Kibana.  This means we must maintain two different images for each illustration.

  With the introduction of the Borealis theme, if we intend for our illustrations to change to the new color palette-- and related colors change with them-- we would now need to maintain _four_ different images for each illustration.  Consider adding "developer blue", high-contrast, and print modes, and the number of images we need to maintain continues to multiply.

  This is an experiment to demonstrate how we could reduce the count to a single image by using CSS variables embedded in the SVG.

  ### SVG display options

  There are three options with which one can display an SVG in Kibana:

  #### Image

  > This is how most SVGs are consumed in Kibana today.

  The SVG is imported as a path and provided to an image tag, or to CSS:

  \`\`\`tsx
    // Webpack returns the SVG as a path to the asset.
    import svg from './path/to/image.svg';

    <img src={svg} alt="description" />
  \`\`\`

  This provides the least flexibility, as the SVG is treated as a static image.  The developer much switch between light and dark modes manually.

  #### React component

  The SVG is converted to a React component:

  \`\`\`tsx
    const SomeImage = () => <svg>...</svg>;

    return <div><SomeImage /></div>;
  \`\`\`

  This provides the most flexibility, as we can use \`emotion\` to flex the image based on the theme and color mode.  Unfortunately, this means React has to maintain the entire SVG as React tree.  It also makes the illustration limited to used only in React.

  #### Inline SVG

  The SVG is inlined in the HTML:

  \`\`\`tsx
    // Webpack returns the SVG as raw content.
    import svg from './path/to/image.svg';

    return <div dangerouslySetInnerHTML={{ __html: svg }} />;
  \`\`\`

  This adds the SVG to the DOM without the (unnecessary) React overhead, giving it the ability to be styled by CSS.  Unfortunately, this means the SVG has to be read as a raw file and written to the DOM using \`dangerouslySetInnerHTML\`.

  This proof-of-concept relies on an alternative method: the SVG is written to the DOM using \`insertAdjacentHTML\` instead.  We would likely _not_ use this technique in production.
  `}
  </EuiMarkdownFormat>
);

const FutureWork = () => (
  <EuiMarkdownFormat textSize="m">{`
## Future work and phases

This project, if slated, would be entirely async.  It would not target any one release, with SVGs being migrated over time.

- Confirm viability of approach with Kibana contributors and EUI, (RFC).
- Confirm viability of workflow with asset and design teams.
- Create \`Illustration\` component.
- Create single Illustration repository within Kibana, (\`@kbn/illustrations\` or \`@kbn/shared-svg\`).
- Move/implement SVGs in stack-ranked order of traffic and/or usage.

`}</EuiMarkdownFormat>
);

const Docs = () => (
  <>
    <IllustrationEuiColors theme="amsterdam" />
    <EuiPageTemplate restrictWidth={true}>
      <EuiPageTemplate.Header pageTitle="Adaptive Illustration SVGs" />
      <EuiPageTemplate.Section>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <Intro />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              direction="column"
              justifyContent="center"
              alignItems="center"
              gutterSize="none"
            >
              <EuiFlexItem>
                <EuiText>
                  <strong>
                    Illustrations in <em>Amsterdam</em>
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <Illustration name="dashboards" theme="amsterdam" isLocal={true} />
              </EuiFlexItem>
              <EuiFlexItem>
                <Illustration name="no_results" theme="amsterdam" isLocal={true} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              direction="column"
              justifyContent="center"
              alignItems="center"
              gutterSize="none"
            >
              <EuiFlexItem>
                <EuiText>
                  <strong>
                    Illustrations in <em>Borealis</em>
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <Illustration name="dashboards" theme="borealis" isLocal={true} />
              </EuiFlexItem>
              <EuiFlexItem>
                <Illustration name="no_results" theme="borealis" isLocal={true} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section>
        <Summary />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section>
        <Background />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section>
        <EuiMarkdownFormat textSize="relative">{`
## Approach

> This proof-of-concept uses SVG files from \`@kbn/shared-svg\`.

1. Define CSS variables for EUI theme colors.
2. Create a single SVG file.
3. Create a color profile JSON file.
4. Render the SVG.

### Define CSS variables for EUI theme colors

> EUI is considering adding theme colors as predictable CSS variables, given a meaningful use case.

Before we can start changing SVGs, we need to provide the core EUI colors as CSS variables:
`}</EuiMarkdownFormat>
        <EuiSpacer size="l" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiText>Amsterdam</EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiCodeBlock language="css" fontSize="m">
                  {`--eui-color-primary: #0077cc;
--eui-color-accent: #f04e98;
--eui-color-warning: #fec514;
--eui-color-success: #00bfb3;
--eui-color-danger: #bd271e;`}
                </EuiCodeBlock>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiText>Borealis</EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiCodeBlock language="css" fontSize="m">
                  {`--eui-color-primary: #0b64dd;
--eui-color-accent: #f588b3;
--eui-color-warning: #ddbf66;
--eui-color-success: #7ed8a9;
--eui-color-danger: #c61e25;`}
                </EuiCodeBlock>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        <EuiMarkdownFormat textSize="relative">{`

Now we need only add the correct set of variables to the \`:root\` of the document, depending on the current theme, and they'll be available throughout.

### Create a single SVG file

To begin, we need to reduce the complexity of the SVG to a single file.  This means removing all color values and replacing them with CSS variables.  Given an SVG file with a color palette of six colors, we'll enumerate each color with a sequential token:

\`\`\`json
{
  "--image-name-fill-one": "#0077CC",
  "--image-name-fill-two": "#0066B1",
  "--image-name-fill-three": "#F04E98",
  "--image-name-fill-four": "#F990C6",
  "--image-name-fill-five": "#F9B110",
  "--image-name-fill-six": "#E4EAF2"
}
\`\`\`

CSS variable declarations allow for a fallback value, if, for whatever reason, the variable values are not provided.  So, we'll start by taking the Amsterdam Light version of the SVG and replace the \`fill\` attributes with a \`style\` property using a CSS variable and fallback:

`}</EuiMarkdownFormat>
        <EuiSpacer size="xl" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiText>Before</EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiCodeBlock language="svg" fontSize="m">
                  {`<svg xmlns="http://www.w3.org/2000/svg">
  <path fill="#0077CC" d="M155.512 41.26c-4.027...
  <path fill="#0066B1" d="M211.629 76.195H66...`}
                </EuiCodeBlock>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiText>After</EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiCodeBlock language="svg" fontSize="m">
                  {`<svg xmlns="http://www.w3.org/2000/svg">
  <path style="fill: var(--image-name-fill-one, #0077CC)"
  <path style="fill: var(--image-name-fill-two, #0066B1)"`}
                </EuiCodeBlock>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section>
        <EuiMarkdownFormat textSize="relative">
          {`
### Create a color profile JSON file

We can then create a JSON file to define and group the colors into a profile:

- \`common\` colors used in all themes and/or color modes.
- \`light\` colors used in light color mode, either globally or thematically.
- \`dark\` colors used in dark color mode, either globally or thematically.

We'll start by placing all colors in the top-level \`common\` group.  This would mean that the SVG will _always_ render with the same colors, regardless of the theme or color mode:

\`\`\`json
{
  "id": "image-name",
  "common": {
    "--image-name-fill-one": "#0077CC",
    "--image-name-fill-two": "#0066B1",
    "--image-name-fill-three": "#F04E98",
    "--image-name-fill-four": "#F990C6",
    "--image-name-fill-five": "#F9B110",
    "--image-name-fill-six": "#E4EAF2"
  },
  "light": { },
  "dark": { },
  "amsterdam": {
    "common": { },
    "light": { },
    "dark": { }
  },
  "borealis": {
    "common": { },
    "light": { },
    "dark": { }
  }
}
\`\`\`

Two of the colors are from the EUI palette, so we can replace them with the EUI CSS variables:

\`\`\`json
{
  "id": "image-name",
  "common": {
    "--image-name-fill-one": "var(--eui-color-primary, #0077CC)",
    "--image-name-fill-two": "#0066B1",
    "--image-name-fill-three": "var(--eui-color-accent, #F04E98)",
    "--image-name-fill-four": "#F990C6",
    "--image-name-fill-five": "#F9B110",
    "--image-name-fill-six": "#E4EAF2"
  },
  ...
\`\`\`

Reviewing the differences between the light and dark versions of the SVG file, we find that \`fill-six\`, a light shade, is actually shifted to a dark shade in the dark version.  So we'll move \`fill-six\` to the \`light\` group, and it's change to the \`dark\` group:

\`\`\`json
{
  "id": "image-name",
  "common": {
    "--image-name-fill-one": "var(--eui-color-primary, #0077CC)",
    "--image-name-fill-three": "var(--eui-color-accent, #F04E98)",
    "--image-name-fill-two": "#0066B1",
    "--image-name-fill-four": "#F990C6",
    "--image-name-fill-five": "#F9B110"
  },
  "light": {
    "--image-name-fill-six": "#E4EAF2"
  },
  "dark": {
    "--image-name-fill-six": "#343741"
  },
  ...
\`\`\`

Colors \`fill-two\`, \`fill-four\`, and \`fill-five\` are not part of the EUI palette, but are rather _shades_ of those colors.  Since they're based on colors from Amsterdam, let's move them to the Amsterdam group:

\`\`\`json
{
  "id": "image-name",
  "common": {
    "--image-name-fill-one": "var(--eui-color-primary, #0077CC)",
    "--image-name-fill-three": "var(--eui-color-accent, #F04E98)",
  },
  "light": {
    "--image-name-fill-six": "#E4EAF2"
  },
  "dark": {
    "--image-name-fill-six": "#343741"
  },
  "amsterdam": {
    "common": {
      "--image-name-fill-two": "#0066B1",
      "--image-name-fill-four": "#F990C6",
      "--image-name-fill-five": "#F9B110"
    },
    "light": { },
    "dark": { }
  },
  ...
}
\`\`\`

For these colors to work in Borealis, we'll need to calculate the RGB difference between the EUI color and the derivitive shade.  Then, we can apply that same difference to the Borealis theme color:

\`\`\`
  Amsterdam primary: #0077CC - R: 0, B: 119, G: 204
  Amsterdam fill two: #0066B1 - R: 0, B: 102, G: 177

  Difference: R: 0, B: -17, G: -27

  Borealis primary: #0B64DD - R: 11, B: 100, G: 221
  Borealis fill two: #0B53C2 - R: 11, B: 83, G: 196
\`\`\`

This leaves us with the completed profile:

\`\`\`json
{
  "id": "image-name",
  "common": {
    "--image-name-fill-one": "var(--eui-color-primary, #0077CC)",
    "--image-name-fill-three": "var(--eui-color-accent, #F04E98)",
  },
  "light": {
    "--image-name-fill-six": "#E4EAF2"
  },
  "dark": {
    "--image-name-fill-six": "#343741"
  },
  "amsterdam": {
    "common": {
      "--image-name-fill-two": "#0066B1",
      "--image-name-fill-four": "#F990C6",
      "--image-name-fill-five": "#F9B110"
    },
    "light": { },
    "dark": { }
  },
  "borealis": {
    "common": {
      "--image-name-fill-two": "#0B53C2",
      "--image-name-fill-four": "#FECAE1",
      "--image-name-fill-five": "#D8AB62"
    },
    "light": { },
    "dark": { }
  }
}

`}
        </EuiMarkdownFormat>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section>
        <EuiMarkdownFormat textSize="relative">{`
### Render the SVG

Most of this detail is left to the pull request, and comments in the code.  To summarize:

1. The SVG is imported dynamically and rendered inline.
2. The color profile is imported dynamically.
3. The current theme and color mode are used to combine the relevant portions of the profile into a single collection of CSS variables.
4. The CSS variables are then applied to the \`:root\` using \`Global\` from \`@emotion/react\`.

There are a few variations for the Storybook demonstration worth noting.

#### The \`isLocal\` prop

This implementation assumes the theme and color mode are constant.  In order to render both Borealis and Amsterdam side-by-side in Storybook, I had to add the ability to scope the variables directly to the SVG using a \`className\`.  There may be cases where we want to do this in Kibana-- e.g. the background of the illustration is always black regardless of color mode-- but that should be rare.

Ideally, these variables would be placed (and replaced) in the single, global \`emotion\` cache.

#### Using \`insertAdjacentHTML\` to render the SVG

This is a hack to get around the fact that Storybook doesn't support inlined SVGs.  We would _not_ use this in production.  Instead, we would find the appropriate Webpack loader to read the SVG as a string and then render it directly to the DOM.
`}</EuiMarkdownFormat>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section>
        <FutureWork />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  </>
);
