/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiSideNav } from '@elastic/eui';
import React from 'react';

interface Props<T = any> {
  items: T[];
  onClick: (node: T) => void;
}

export default class DirectoryTree extends React.Component<Props, any> {
  public to = node => {
    const data = {
      id: node.name,
      name: node.name,
      isSelected: true,
      onClick: () => {
        if (this.props.onClick) {
          this.props.onClick(node);
        }
      },
    };
    if (node.children && node.children.length > 0) {
      data.icon = <EuiIcon type="arrowRight" />;
      data.items = node.children.map(this.to);
    }
    return data;
  };

  public render() {
    const items = this.props.items.map(this.to);
    return <EuiSideNav items={items} style={{ width: 192 }} />;
  }
}
