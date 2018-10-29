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
import { SymbolWithMembers } from '../../reducers/symbol';
import { structureSelector } from '../../selectors';

interface Props {
  structureTree: any;
}

const sortSymbol = (a, b) => {
  const lineDiff = a.location.range.start.line - b.location.range.start.line;
  if (lineDiff === 0) {
    return a.location.range.start.character - b.location.range.start.character;
  } else {
    return lineDiff;
  }
};
class SymbolTreeComponent extends React.PureComponent<Props> {
  public getStructureTreeItemRenderer = (location: Location, name: string) => () => (
    <div className="symbolLinkContainer">
      <Link to={RepositoryUtils.locationToUrl(location)}>{name}</Link>
    </div>
  );

  public symbolsToSideNavItems = (symbolsWithMembers: SymbolWithMembers[]) => {
    return symbolsWithMembers
      .map((s: SymbolWithMembers, index: number) => {
        const item = {
          location: s.location,
          name: s.name,
          id: `${s.name}_${index}`,
          renderItem: this.getStructureTreeItemRenderer(s.location, s.name),
        };
        if (s.members) {
          item.items = this.symbolsToSideNavItems(Array.from(s.members));
          item.forceOpen = true;
        }
        return item;
      })
      .sort(sortSymbol);
  };

  public render() {
    const items = [
      { name: '', id: '', items: this.symbolsToSideNavItems(this.props.structureTree) },
    ];
    return <EuiSideNav items={items} style={{ overflow: 'auto' }} className="sideNavTree" />;
  }
}

const mapStateToProps = (state: any) => {
  return { structureTree: structureSelector(state) };
};

export const SymbolTree = withRouter(connect(mapStateToProps)(SymbolTreeComponent));
