import React, {
  Component,
} from 'react';

import {
  KuiTable,
  KuiTableRow,
  KuiTableRowCell,
  KuiTableHeaderCell,
  KuiTableHeader,
  KuiTableBody,
} from '../../../../components';

import {
  SortableProperties,
} from '../../../../src/services';

export class FluidTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      sortedColumn: 'title',
    };

    this.items = [{
      title: 'Cryogenics',
      description: 'AC turned to 11',
    }, {
      title: 'Propellant',
      description: 'Go fast',
    }, {
      title: 'Rockets',
      description: 'Hot and burny',
    }];

    this.sortableProperties = new SortableProperties([{
      name: 'title',
      getValue: item => item.title.toLowerCase(),
      isAscending: true,
    }, {
      name: 'description',
      getValue: item => item.description.toLowerCase(),
      isAscending: true,
    }], this.state.sortedColumn);
  }

  onSort = prop => {
    this.sortableProperties.sortOn(prop);

    this.setState({
      sortedColumn: prop,
    });
  }

  renderRows() {
    return this.items.map(item => (
      <KuiTableRow key={item.title}>
        <KuiTableRowCell>
          {item.title}
        </KuiTableRowCell>

        <KuiTableRowCell>
          {item.description}
        </KuiTableRowCell>

        <KuiTableRowCell>
          <select className="kuiSelect" defaultValue="on">
            <option value="on">On</option>
            <option value="off">Off</option>
            <option value="selfDestruct">Self-destruct</option>
          </select>
        </KuiTableRowCell>
      </KuiTableRow>
    ));
  }

  render() {
    return (
      <KuiTable shrinkToContent={true}>
        <KuiTableHeader>
          <KuiTableHeaderCell
            onSort={this.onSort.bind(this, 'title')}
            isSorted={this.state.sortedColumn === 'title'}
            isSortAscending={this.sortableProperties.isAscendingByName('title')}
          >
            System
          </KuiTableHeaderCell>

          <KuiTableHeaderCell
            onSort={this.onSort.bind(this, 'description')}
            isSorted={this.state.sortedColumn === 'description'}
            isSortAscending={this.sortableProperties.isAscendingByName('description')}
          >
            Description
          </KuiTableHeaderCell>

          <KuiTableHeaderCell>
            Action
          </KuiTableHeaderCell>
        </KuiTableHeader>

        <KuiTableBody>
          {this.renderRows()}
        </KuiTableBody>
      </KuiTable>
    );
  }
}
