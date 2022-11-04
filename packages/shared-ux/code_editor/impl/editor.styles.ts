import { useEuiTheme } from "@elastic/eui";
import { css } from "@emotion/react";

const { euiTheme } = useEuiTheme();

export const CodeEditorMonacoStyles = () => css`{
        animation: none !important; // Removes textarea EUI blue underline animation from EUI
}`;

export const CodeEditorStyles = () => css`{
  position: relative;
  height: 100%;
}`;

export const CodeEditorControlsStyles = () => css`{
  top: ${euiTheme.size.xs};
  right: ${euiTheme.base};
  position: absolute;
  z-index: 1000
}
`;
  
export const CodeEditorFullScreenStyles = () => css`{
  position: absolute;
  left: 0;
  top: 0;
  .kibanaCodeEditor__controls {
    top: ${euiTheme.size.l};
    right: ${euiTheme.size.l};
  }
}`

export const CodeEditorPlaceholderStyles = () => css`{
  color: ${euiTheme.colors.subduedText};
  width: max-content;
  pointer-events: none;
}`

export const CodeEditorKeyboardHintStyles = () => css`{
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  left: 0;

  &:focus {
    // $euiZLevel1
    z-index: ${euiTheme.levels.mask};
  }

  &--isInactive {
    display: none;
  }
}`
