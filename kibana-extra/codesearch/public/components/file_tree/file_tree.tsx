/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { EuiIcon, EuiSideNav } from '@elastic/eui';

import { FileTree as Tree, FileTreeItemType } from '../../../model';

type Path = string;

interface Props {
  node?: Tree;
  onClick: (p: Path) => void;
  getTreeToggler: (path: Path) => (p: any) => void;
  openedPaths: string[];
  activePath: string;
}

export class FileTree extends React.Component<Props, any> {
  public getItemRenderer = (node: Tree, forceOpen: boolean) => () => {
    const className = this.props.activePath === node.path ? 'activeFileNode' : 'fileNode';
    const onClick = () => this.props.onClick(node.path || '');
    switch (node.type) {
      case FileTreeItemType.Directory: {
        return (
          <div onClick={onClick} className={className}>
            <EuiIcon
              type={forceOpen ? 'arrowDown' : 'arrowRight'}
              onClick={this.props.getTreeToggler(node.path || '')}
            />
            {`${node.name}/`}
          </div>
        );
      }
      case FileTreeItemType.Submodule: {
        return (
          <div onClick={onClick} className={className}>
            {node.name}
          </div>
        );
      }
      case FileTreeItemType.File: {
        return (
          <div onClick={onClick} className={className}>
            {node.name}
          </div>
        );
      }
    }
  };

  public treeToItems = (node: Tree): any => {
    const forceOpen = this.props.openedPaths.includes(node.path!);
    const data = {
      id: node.name,
      name: node.name,
      isSelected: false,
      renderItem: this.getItemRenderer(node, forceOpen),
      forceOpen,
    };
    if (forceOpen && node.type === 1 && node.children && node.children.length > 0) {
      data.items = node.children.map(this.treeToItems);
    }
    return data;
  };

  public render() {
    return (
      this.props.node && (
        <EuiSideNav
          items={(this.props.node.children || []).map(this.treeToItems)}
          className="fileTree"
          style={{ overflow: 'auto' }}
        />
      )
    );
  }
}
