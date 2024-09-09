/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getEndpointFromPosition } from '../../../../lib/autocomplete/get_endpoint_from_position';
import { SenseEditor } from '../../../models/sense_editor';

export async function autoIndent(editor: SenseEditor, event: React.MouseEvent) {
  event.preventDefault();
  await editor.autoIndent();
  editor.getCoreEditor().getContainer().focus();
}

export function getDocumentation(
  editor: SenseEditor,
  docLinkVersion: string
): Promise<string | null> {
  return editor.getRequestsInRange().then((requests) => {
    if (!requests || requests.length === 0) {
      return null;
    }
    const position = requests[0].range.end;
    position.column = position.column - 1;
    const endpoint = getEndpointFromPosition(editor.getCoreEditor(), position, editor.parser);
    if (endpoint && endpoint.documentation && endpoint.documentation.indexOf('http') !== -1) {
      return endpoint.documentation
        .replace('/master/', `/${docLinkVersion}/`)
        .replace('/current/', `/${docLinkVersion}/`)
        .replace('/{branch}/', `/${docLinkVersion}/`);
    } else {
      return null;
    }
  });
}
