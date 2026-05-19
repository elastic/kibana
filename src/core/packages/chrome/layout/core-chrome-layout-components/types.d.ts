import type { UseEuiTheme } from '@elastic/eui';
import type { SerializedStyles } from '@emotion/serialize';
export type EmotionFn = (useEuiTheme: UseEuiTheme) => SerializedStyles;
