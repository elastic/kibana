/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { VectorTile, VectorTileFeature } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import { EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef } from 'react';

// Ensure the modes we might switch to dynamically are available
import 'brace/mode/text';
import 'brace/mode/hjson';
import 'brace/mode/yaml';

import { expandLiteralStrings } from '../../../../../shared_imports';
import {
  useEditorReadContext,
  useRequestReadContext,
  useServicesContext,
} from '../../../../contexts';
import { createReadOnlyAceEditor, CustomAceEditor } from '../../../../models/legacy_core_editor';
import { subscribeResizeChecker } from '../subscribe_console_resize_checker';
import { applyCurrentSettings } from './apply_editor_settings';

const isJSONContentType = (contentType?: string) =>
  Boolean(contentType && contentType.indexOf('application/json') >= 0);

const isMapboxVectorTile = (contentType?: string) =>
  contentType?.includes('application/vnd.mapbox-vector-tile') ?? false;

/**
 * Best effort expand literal strings
 */
const safeExpandLiteralStrings = (data: string): string => {
  try {
    return expandLiteralStrings(data);
  } catch (e) {
    return data;
  }
};

function modeForContentType(contentType?: string) {
  if (!contentType) {
    return 'ace/mode/text';
  }
  if (isJSONContentType(contentType)) {
    // Using hjson will allow us to use comments in editor output and solves the problem with error markers
    return 'ace/mode/hjson';
  } else if (contentType.indexOf('application/yaml') >= 0) {
    return 'ace/mode/yaml';
  }
  return 'ace/mode/text';
}

interface Output {
  [key: string]: {};
}

function parseResult(response: VectorTile) {
  const data = response.layers;
  const output: Output = {};

  for (const property in data) {
    if (data.hasOwnProperty(property)) {
      const propertyObject = data[property];
      const featuresArray = [];

      for (let index = 0; index < propertyObject.length; index++) {
        const feature = propertyObject.feature(index);
        const properties = feature.properties;
        const geometry = feature.loadGeometry()[0];
        const typeName = VectorTileFeature.types[feature.type];
        let coordinates = [];

        const coordinatesArray = [];
        for (const value of geometry) {
          coordinatesArray.push([value.x, value.y]);
        }

        switch (feature.type) {
          case 1:
            coordinates.push(geometry[0].x, geometry[0].y);
            break;
          case 2: {
            coordinates = coordinatesArray;
            break;
          }
          case 3: {
            coordinates.push(coordinatesArray);
            break;
          }
        }

        featuresArray.push({
          geometry: {
            type: typeName,
            coordinates,
          },
          properties,
        });
      }

      output[property] = [...featuresArray];
    }
  }

  const sortedOutput = Object.fromEntries(Object.entries(output).sort().reverse()); // "meta" layer is now in top of the result

  return JSON.stringify(sortedOutput, null, '\t');
}

function EditorOutputUI() {
  const editorRef = useRef<null | HTMLDivElement>(null);
  const editorInstanceRef = useRef<null | CustomAceEditor>(null);
  const { services } = useServicesContext();
  const { settings: readOnlySettings } = useEditorReadContext();
  const {
    lastResult: { data, error },
  } = useRequestReadContext();
  const inputId = 'ConAppOutputTextarea';

  useEffect(() => {
    editorInstanceRef.current = createReadOnlyAceEditor(editorRef.current!);
    const unsubscribe = subscribeResizeChecker(editorRef.current!, editorInstanceRef.current);
    const textarea = editorRef.current!.querySelector('textarea')!;
    textarea.setAttribute('id', inputId);
    textarea.setAttribute('readonly', 'true');

    return () => {
      unsubscribe();
      editorInstanceRef.current!.destroy();
    };
  }, [services.settings]);

  useEffect(() => {
    const editor = editorInstanceRef.current!;
    if (data) {
      const mode = modeForContentType(data[0].response.contentType);
      editor.update(
        data
          .map((result) => {
            const { value, contentType } = result.response;

            let editorOutput;
            if (readOnlySettings.tripleQuotes && isJSONContentType(contentType)) {
              editorOutput = safeExpandLiteralStrings(value as string);
            }

            if (isMapboxVectorTile(contentType)) {
              const vectorTile = new VectorTile(new Protobuf(value as ArrayBuffer));
              editorOutput = parseResult(vectorTile);
            }
            return editorOutput;
          })
          .join('\n'),
        mode
      );
    } else if (error) {
      const mode = modeForContentType(error.response.contentType);
      editor.update(error.response.value as string, mode);
    } else {
      editor.update('');
    }
  }, [readOnlySettings, data, error]);

  useEffect(() => {
    applyCurrentSettings(editorInstanceRef.current!, readOnlySettings);
  }, [readOnlySettings]);

  return (
    <>
      <EuiScreenReaderOnly>
        <label htmlFor={inputId}>
          {i18n.translate('console.outputTextarea', {
            defaultMessage: 'Dev Tools Console output',
          })}
        </label>
      </EuiScreenReaderOnly>
      <div ref={editorRef} className="conApp__output" data-test-subj="response-editor">
        <div className="conApp__outputContent" id="ConAppOutput" />
      </div>
    </>
  );
}

export const EditorOutput = React.memo(EditorOutputUI);
