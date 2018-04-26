import React from 'react';

import {
  KuiTable,
  KuiTableRow,
  KuiTableRowCell,
  KuiTableHeaderCell,
  KuiTableHeader,
  KuiTableBody,
} from '../../../../components';

import {
  RIGHT_ALIGNMENT
} from '../../../../src/services';

export function TableWithMenuButtons() {
  return (
    <KuiTable>
      <KuiTableHeader>
        <KuiTableHeaderCell>
          Reminder
        </KuiTableHeaderCell>
        <KuiTableHeaderCell>
          A
        </KuiTableHeaderCell>
        <KuiTableHeaderCell>
          B
        </KuiTableHeaderCell>
        <KuiTableHeaderCell>
          C
        </KuiTableHeaderCell>
        <KuiTableHeaderCell className="kuiTableHeaderCell--alignRight">
          Actions
        </KuiTableHeaderCell>
      </KuiTableHeader>

      <KuiTableBody>
        <KuiTableRow>
          <KuiTableRowCell>
            Core temperature critical
          </KuiTableRowCell>
          <KuiTableRowCell>
            A
          </KuiTableRowCell>
          <KuiTableRowCell>
            B
          </KuiTableRowCell>
          <KuiTableRowCell>
            C
          </KuiTableRowCell>
          <KuiTableRowCell align={RIGHT_ALIGNMENT}>
            <div className="kuiMenuButtonGroup kuiMenuButtonGroup--alignRight">
              <button className="kuiMenuButton kuiMenuButton--basic">
                Acknowledge
              </button>
              <button className="kuiMenuButton kuiMenuButton--basic">
                Silence
              </button>
              <button className="kuiMenuButton kuiMenuButton--danger">
                Delete
              </button>
            </div>
          </KuiTableRowCell>
        </KuiTableRow>

        <KuiTableRow>
          <KuiTableRowCell>
            Time for your snack
          </KuiTableRowCell>
          <KuiTableRowCell>
            A
          </KuiTableRowCell>
          <KuiTableRowCell>
            B
          </KuiTableRowCell>
          <KuiTableRowCell>
            C
          </KuiTableRowCell>
          <KuiTableRowCell align={RIGHT_ALIGNMENT}>
            <div className="kuiMenuButtonGroup kuiMenuButtonGroup--alignRight">
              <button className="kuiMenuButton kuiMenuButton--basic">
                Acknowledge
              </button>
              <button className="kuiMenuButton kuiMenuButton--basic">
                Silence
              </button>
              <button className="kuiMenuButton kuiMenuButton--danger">
                Delete
              </button>
            </div>
          </KuiTableRowCell>
        </KuiTableRow>
      </KuiTableBody>
    </KuiTable>
  );
}
