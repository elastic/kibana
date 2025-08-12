# @kbn/css-utils

Shared Emotion-based CSS utilities for use across Kibana.

This package includes reusable styling helpers designed to support styling with Emotion.

## ✨ Included Utilities

- `useMemoCss`: React hook to memoize Emotion styles.
- `kbnFullBodyHeightCss`: Utility for full-body-height layout styling.
- `kbnFullScreenBgCss`: Full-screen graphics styling helper, used in various login page.

## 📌 Usage

To prevent unnecessary chunk size bloat, always import directly from specific helper files:

```ts
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
