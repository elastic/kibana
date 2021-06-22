/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cell } from './cell';

describe('cell renderer', () => {
  it('renders a cell without filter buttons if it is not filterable', () => {
    expect(
      cell({
        filterable: false,
        column: 'foo',
        timefield: true,
        sourcefield: false,
        formatted: 'formatted content',
      })
    ).toMatchInlineSnapshot(`
      "<td class=\\"eui-textNoWrap\\" width=\\"1%\\" data-test-subj=\\"docTableField\\">formatted content<span class=\\"kbnDocTableCell__filter\\"></span></td>
      "
    `);
  });

  it('renders a cell with filter buttons if it is filterable', () => {
    expect(
      cell({
        filterable: true,
        column: 'foo',
        timefield: true,
        sourcefield: false,
        formatted: 'formatted content',
      })
    ).toMatchInlineSnapshot(`
      "<td class=\\"eui-textNoWrap\\" width=\\"1%\\" data-test-subj=\\"docTableField\\">formatted content<span class=\\"kbnDocTableCell__filter\\"><button
              ng-click=\\"inlineFilter($event, '+')\\"
              class=\\"kbnDocTableRowFilterButton\\"
              data-column=\\"foo\\"
              tooltip-append-to-body=\\"1\\"
              data-test-subj=\\"docTableCellFilter\\"
              tooltip=\\"{{ ::'discover.docTable.tableRow.filterForValueButtonTooltip' | i18n: {defaultMessage: 'Filter for value'} }}\\"
              tooltip-placement=\\"bottom\\"
              aria-label=\\"{{ ::'discover.docTable.tableRow.filterForValueButtonAriaLabel' | i18n: {defaultMessage: 'Filter for value'} }}\\"
            ><icon type=\\"'plusInCircle'\\" size=\\"'s'\\" color=\\"'primary'\\"></icon></button><button
              ng-click=\\"inlineFilter($event, '-')\\"
              class=\\"kbnDocTableRowFilterButton\\"
              data-column=\\"foo\\"
              data-test-subj=\\"docTableCellFilterNegate\\"
              tooltip=\\"{{ ::'discover.docTable.tableRow.filterOutValueButtonTooltip' | i18n: {defaultMessage: 'Filter out value'} }}\\"
              aria-label=\\"{{ ::'discover.docTable.tableRow.filterOutValueButtonAriaLabel' | i18n: {defaultMessage: 'Filter out value'} }}\\"
              tooltip-append-to-body=\\"1\\"
              tooltip-placement=\\"bottom\\"
            ><icon type=\\"'minusInCircle'\\" size=\\"'s'\\" color=\\"'primary'\\"></icon></button></span></td>
      "
    `);
  });

  it('renders a sourcefield', () => {
    expect(
      cell({
        filterable: false,
        column: 'foo',
        timefield: false,
        sourcefield: true,
        formatted: 'formatted content',
      })
    ).toMatchInlineSnapshot(`
      "<td class=\\"eui-textBreakAll eui-textBreakWord\\"  data-test-subj=\\"docTableField\\">formatted content<span class=\\"kbnDocTableCell__filter\\"></span></td>
      "
    `);
  });

  it('renders a field that is neither a timefield or sourcefield', () => {
    expect(
      cell({
        filterable: false,
        column: 'foo',
        timefield: false,
        sourcefield: false,
        formatted: 'formatted content',
      })
    ).toMatchInlineSnapshot(`
      "<td class=\\"kbnDocTableCell__dataField eui-textBreakAll eui-textBreakWord\\"  data-test-subj=\\"docTableField\\">formatted content<span class=\\"kbnDocTableCell__filter\\"></span></td>
      "
    `);
  });

  it('renders the "formatted" contents without any manipulation', () => {
    expect(
      cell({
        filterable: false,
        column: 'foo',
        timefield: true,
        sourcefield: false,
        formatted:
          '<div> <pre> hey you can put HTML & stuff in here </pre> <button onClick="alert(1)">button!</button> </div>',
      })
    ).toMatchInlineSnapshot(`
      "<td class=\\"eui-textNoWrap\\" width=\\"1%\\" data-test-subj=\\"docTableField\\"><div> <pre> hey you can put HTML & stuff in here </pre> <button onClick=\\"alert(1)\\">button!</button> </div><span class=\\"kbnDocTableCell__filter\\"></span></td>
      "
    `);
  });

  it('escapes the contents of "column" within the "data-column" attribute', () => {
    expect(
      cell({
        filterable: true,
        column: '<foo content here />',
        timefield: true,
        sourcefield: false,
        formatted: 'formatted content',
      })
    ).toMatchInlineSnapshot(`
      "<td class=\\"eui-textNoWrap\\" width=\\"1%\\" data-test-subj=\\"docTableField\\">formatted content<span class=\\"kbnDocTableCell__filter\\"><button
              ng-click=\\"inlineFilter($event, '+')\\"
              class=\\"kbnDocTableRowFilterButton\\"
              data-column=\\"&lt;foo content here /&gt;\\"
              tooltip-append-to-body=\\"1\\"
              data-test-subj=\\"docTableCellFilter\\"
              tooltip=\\"{{ ::'discover.docTable.tableRow.filterForValueButtonTooltip' | i18n: {defaultMessage: 'Filter for value'} }}\\"
              tooltip-placement=\\"bottom\\"
              aria-label=\\"{{ ::'discover.docTable.tableRow.filterForValueButtonAriaLabel' | i18n: {defaultMessage: 'Filter for value'} }}\\"
            ><icon type=\\"'plusInCircle'\\" size=\\"'s'\\" color=\\"'primary'\\"></icon></button><button
              ng-click=\\"inlineFilter($event, '-')\\"
              class=\\"kbnDocTableRowFilterButton\\"
              data-column=\\"&lt;foo content here /&gt;\\"
              data-test-subj=\\"docTableCellFilterNegate\\"
              tooltip=\\"{{ ::'discover.docTable.tableRow.filterOutValueButtonTooltip' | i18n: {defaultMessage: 'Filter out value'} }}\\"
              aria-label=\\"{{ ::'discover.docTable.tableRow.filterOutValueButtonAriaLabel' | i18n: {defaultMessage: 'Filter out value'} }}\\"
              tooltip-append-to-body=\\"1\\"
              tooltip-placement=\\"bottom\\"
            ><icon type=\\"'minusInCircle'\\" size=\\"'s'\\" color=\\"'primary'\\"></icon></button></span></td>
      "
    `);
  });
});
