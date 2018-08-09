/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSideNav } from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import { Link, withRouter } from 'react-router-dom';
import { Location } from 'vscode-languageserver-types/lib/esm/main';
import { RepositoryUtils } from '../../../common/repository_utils';
import { symbolTreeSelector, SymbolWithMembers } from '../../selectors';

interface Props {
  structureTree: any;
}
class SymbolTreeComponent extends React.PureComponent<Props> {
  public getStructureTreeItemRenderer = (location: Location, name: string) => () => (
    <div className="symbolLinkContainer">
      <Link to={RepositoryUtils.locationToUrl(location)}>{name}</Link>
    </div>
  );

  public symbolsToSideNavItems = (symbolsWithMembers: SymbolWithMembers[]) => {
    return symbolsWithMembers.map((s: SymbolWithMembers, index: number) => {
      const item = {
        name: s.name,
        id: `${s.name}_${index}`,
        renderItem: this.getStructureTreeItemRenderer(s.location, s.name),
      };
      if (s.members) {
        item.items = this.symbolsToSideNavItems(Array.from(s.members));
        item.forceOpen = true;
      }
      return item;
    });
  };

  public render() {
    const items = this.symbolsToSideNavItems(this.props.structureTree);
    return <EuiSideNav items={items} style={{ overflow: 'auto' }} className="sideNavTree" />;
  }
}

const mapStateToProps = (state: any) => {
  return { structureTree: symbolTreeSelector(state) };
};

export const SymbolTree = withRouter(connect(mapStateToProps)(SymbolTreeComponent));
