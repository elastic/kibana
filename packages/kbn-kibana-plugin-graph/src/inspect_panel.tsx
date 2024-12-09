/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

interface Props {
  containerHeight: number | undefined;
  graph: cytoscape.ElementsDefinition | null;
  inspectedNode: string | undefined;
  selectedNodes: string[];
  onClose: () => void;
  onSelectNode: (node: string) => void;
  onAddNode: (node: string) => void;
  onRemoveNode: (node: string) => void;
}

export function InspectPanel({
  containerHeight,
  graph,
  inspectedNode,
  selectedNodes,
  onClose,
  onSelectNode,
  onAddNode,
  onRemoveNode,
}: Props) {
  const importedRequired: string[] = [];
  const importedOptional: string[] = [];

  const importedByRequired: string[] = [];
  const importedByOptional: string[] = [];

  if (graph?.edges) {
    for (const edge of graph?.edges) {
      if (edge.data.source === inspectedNode && !importedRequired.includes(edge.data.target)) {
        if (edge.data.type === 'requiredPlugin') importedRequired.push(edge.data.target);
        if (edge.data.type === 'optionalPlugin' || edge.data.type === 'bundle')
          importedOptional.push(edge.data.target);
      }

      if (edge.data.target === inspectedNode && !importedByRequired.includes(edge.data.source)) {
        if (edge.data.type === 'requiredPlugin') importedByRequired.push(edge.data.source);
        if (edge.data.type === 'optionalPlugin' || edge.data.type === 'bundle')
          importedByOptional.push(edge.data.source);
      }
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 2,
        bottom: 20,
        right: 20,
        maxHeight: containerHeight ? containerHeight : 'auto',
      }}
    >
      <EuiPanel
        style={{
          width: 300,
          minHeight: 0,
          overflow: 'scroll',
          maxHeight: containerHeight ? containerHeight : 'auto',
        }}
      >
        <EuiButtonIcon
          aria-label="Close inspect panel"
          style={{ position: 'absolute', right: 10 }}
          iconType="cross"
          onClick={onClose}
        />

        <EuiTitle size="s">
          <EuiButtonEmpty
            onClick={() => {
              if (inspectedNode) {
                onSelectNode(inspectedNode);
              }
            }}
            style={{ paddingRight: 20 }}
            textProps={{ className: 'eui-textTruncate' }}
          >
            {inspectedNode}
          </EuiButtonEmpty>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiAccordion
          id="options"
          buttonContent={
            <EuiTitle size="xs">
              <h3>Imports ({importedRequired?.length + importedOptional.length})</h3>
            </EuiTitle>
          }
          initialIsOpen
          paddingSize="none"
        >
          <EuiListGroup>
            <EuiListGroupItem label="Required" color="text" iconType="warning" />
            {importedRequired.length ? (
              importedRequired.sort().map((node) => (
                <EuiListGroupItem
                  key={node}
                  label={node}
                  onClick={() => onSelectNode(node)}
                  extraAction={
                    selectedNodes.includes(node)
                      ? {
                          type: 'button',
                          iconType: 'cross',
                          onClick: () => onRemoveNode(node),
                          alwaysShow: true,
                        }
                      : {
                          type: 'button',
                          iconType: 'plus',
                          onClick: () => onAddNode(node),
                          alwaysShow: true,
                        }
                  }
                />
              ))
            ) : (
              <EuiListGroupItem label="-" color="subdued" />
            )}

            <EuiSpacer size="m" />

            <EuiListGroupItem iconType="starEmpty" label="Optional" />
            {importedOptional.length ? (
              importedOptional.sort().map((node) => (
                <EuiListGroupItem
                  key={node}
                  label={node}
                  onClick={() => onSelectNode(node)}
                  extraAction={
                    selectedNodes.includes(node)
                      ? {
                          type: 'button',
                          iconType: 'cross',
                          onClick: () => onRemoveNode(node),
                          alwaysShow: true,
                        }
                      : {
                          type: 'button',
                          iconType: 'plus',
                          onClick: () => onAddNode(node),
                          alwaysShow: true,
                        }
                  }
                />
              ))
            ) : (
              <EuiListGroupItem label="-" color="subdued" />
            )}
          </EuiListGroup>
        </EuiAccordion>

        <EuiSpacer size="m" />

        <EuiAccordion
          id="options"
          buttonContent={
            <EuiTitle size="xs">
              <h3>Imported by ({importedByRequired?.length + importedByOptional.length})</h3>
            </EuiTitle>
          }
          paddingSize="none"
        >
          <EuiListGroup>
            <EuiListGroupItem iconType="warning" label="Required" />
            {importedByRequired.length ? (
              importedByRequired.sort().map((node) => (
                <EuiListGroupItem
                  key={node}
                  label={node}
                  onClick={() => onSelectNode(node)}
                  extraAction={
                    selectedNodes.includes(node)
                      ? {
                          type: 'button',
                          iconType: 'cross',
                          onClick: () => onRemoveNode(node),
                          alwaysShow: true,
                        }
                      : {
                          type: 'button',
                          iconType: 'plus',
                          onClick: () => onAddNode(node),
                          alwaysShow: true,
                        }
                  }
                />
              ))
            ) : (
              <EuiListGroupItem label="-" color="subdued" />
            )}

            <EuiSpacer size="m" />

            <EuiListGroupItem iconType="starEmpty" label="Optional" />
            {importedByOptional.length ? (
              importedByOptional.sort().map((node) => (
                <EuiListGroupItem
                  key={node}
                  label={node}
                  onClick={() => onSelectNode(node)}
                  extraAction={
                    selectedNodes.includes(node)
                      ? {
                          type: 'button',
                          iconType: 'cross',
                          onClick: () => onRemoveNode(node),
                          alwaysShow: true,
                        }
                      : {
                          type: 'button',
                          iconType: 'plus',
                          onClick: () => onAddNode(node),
                          alwaysShow: true,
                        }
                  }
                />
              ))
            ) : (
              <EuiListGroupItem label="-" color="subdued" />
            )}
          </EuiListGroup>
        </EuiAccordion>
      </EuiPanel>
    </div>
  );
}
