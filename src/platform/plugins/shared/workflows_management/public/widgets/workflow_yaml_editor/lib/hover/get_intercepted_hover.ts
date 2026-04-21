/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import { getAllYamlHoverProviders } from './intercept_monaco_yaml_hover_provider';

export async function getInterceptedHover(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  cancellationToken: monaco.CancellationToken
): Promise<monaco.languages.Hover | null> {
  try {
    const hoverProviders = getAllYamlHoverProviders();
    for (const provider of hoverProviders) {
      const hover = await provider.provideHover(model, position, cancellationToken);
      if (hover) {
        const trustedContents = hover.contents
          .map((content) => ({
            value: content.value
              .replace(/Source: .*$/, '')
              .replace(/^\s*(#{1,6}\s*)?\|\|\s*$/gm, '')
              .trimEnd(),
          }))
          .filter((content) => {
            const trimmed = content.value.trim();
            return trimmed.length > 0 && !/^(#{1,6}\s*)?[\s|]*$/.test(trimmed);
          });

        if (trustedContents.length === 0) {
          return null;
        }

        return {
          ...hover,
          contents: trustedContents,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}
