import type { Decorator } from '@storybook/react';
import React from 'react';
import * as styledComponents from 'styled-components';
import type { ThemeProviderProps } from 'styled-components';
import type { euiThemeVars } from '@kbn/ui-theme';
/**
 * A `deprecated` structure representing a Kibana theme containing variables from the current EUI theme.
 */
export interface EuiTheme {
    /** EUI theme vars that automaticall adjust to light and dark mode. */
    eui: typeof euiThemeVars;
    /** True if the theme is in "dark" mode, false otherwise. */
    darkMode: boolean;
}
/**
 * A `styled-components` `ThemeProvider` that incorporates EUI dark mode.
 */
declare const KibanaStyledComponentsThemeProvider: <OuterTheme extends styledComponents.DefaultTheme = styledComponents.DefaultTheme>({ darkMode, ...otherProps }: Omit<ThemeProviderProps<OuterTheme, OuterTheme & EuiTheme>, "theme"> & {
    darkMode?: boolean;
}) => React.JSX.Element;
/**
 * Storybook decorator using the EUI theme provider. Uses the value from
 * `globals` provided by the Storybook theme switcher.
 *
 * @deprecated All Kibana components need to migrate to Emotion.
 */
export declare const KibanaStyledComponentsThemeProviderDecorator: Decorator;
declare const euiStyled: styledComponents.ThemedStyledInterface<EuiTheme>, 
/** see https://styled-components.com/docs/api#css-prop */
css: styledComponents.ThemedCssFunction<EuiTheme>, 
/** see https://styled-components.com/docs/api#createglobalstyle */
createGlobalStyle: <P extends object = {}>(first: TemplateStringsArray | styledComponents.CSSObject | styledComponents.InterpolationFunction<styledComponents.ThemedStyledProps<P, EuiTheme>>, ...interpolations: styledComponents.Interpolation<styledComponents.ThemedStyledProps<P, EuiTheme>>[]) => styledComponents.GlobalStyleComponent<P, EuiTheme>, 
/** see https://styled-components.com/docs/api#keyframes */
keyframes: (strings: TemplateStringsArray | styledComponents.CSSKeyframes, ...interpolations: styledComponents.SimpleInterpolation[]) => styledComponents.Keyframes, 
/** see https://styled-components.com/docs/api#withtheme */
withTheme: styledComponents.WithThemeFnInterface<EuiTheme>;
export { css, euiStyled, KibanaStyledComponentsThemeProvider, createGlobalStyle, keyframes, withTheme, };
