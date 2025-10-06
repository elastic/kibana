/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// import { useEffect } from 'react';
// import { monaco } from '@kbn/monaco';

// export const useConnectorDecorations = () => {
//   // Connector-id shadow text decorations effect
//   useEffect(() => {
//     if (!isEditorMounted || !editorRef.current || !yamlDocument) {
//       return;
//     }

//     const timeoutId = setTimeout(() => {
//       const editor = editorRef.current!;
//       const model = editor.getModel();
//       if (!model) return;

//       // Clear existing connector-id shadow decorations
//       if (connectorIdShadowDecorationCollectionRef.current) {
//         connectorIdShadowDecorationCollectionRef.current.clear();
//         connectorIdShadowDecorationCollectionRef.current = null;
//       }

//       const decorations: monaco.editor.IModelDeltaDecoration[] = [];

//       // Find all connector-id lines in the document
//       const totalLines = model.getLineCount();
//       for (let lineNumber = 1; lineNumber <= totalLines; lineNumber++) {
//         const line = model.getLineContent(lineNumber);
//         const connectorIdMatch = line.match(/^\s*connector-id:\s*([a-zA-Z0-9-_]+)\s*$/);

//         if (connectorIdMatch) {
//           const connectorId = connectorIdMatch[1];

//           // Get the connector type for this step by finding the step context
//           try {
//             const absolutePosition = model.getOffsetAt({ lineNumber, column: 1 });
//             const path = getCurrentPath(yamlDocument, absolutePosition);
//             const connectorType = getConnectorTypeFromContext(yamlDocument, path, model, {
//               lineNumber,
//               column: 1,
//             });

//             if (connectorType && connectorsData?.connectorTypes) {
//               const instances = getConnectorInstancesForType(
//                 connectorType,
//                 connectorsData.connectorTypes
//               );
//               const instance = instances.find((i) => i.id === connectorId);

//               if (instance) {
//                 // Add shadow text decoration at the end of the line
//                 decorations.push({
//                   range: new monaco.Range(lineNumber, line.length + 1, lineNumber, line.length + 1),
//                   options: {
//                     after: {
//                       content: ` # ${instance.name}`,
//                       inlineClassName: 'connector-id-shadow-text',
//                     },
//                   },
//                 });
//                 // console.log('Creating decoration:', {
//                 //   lineNumber,
//                 //   line,
//                 //   lineLength: line.length,
//                 //   endColumn: line.length + 1,
//                 //   content: ` # ${instance.name}`,
//                 // });
//               }
//             }
//           } catch (error) {
//             // Ignore errors in shadow text generation
//           }
//         }
//       }

//       if (decorations.length > 0) {
//         connectorIdShadowDecorationCollectionRef.current =
//           editor.createDecorationsCollection(decorations);
//       }
//     }, 100); // Small delay to avoid multiple rapid executions
//   }, [isEditorMounted, editorRef, yamlDocument, connectorsData]);
// };
