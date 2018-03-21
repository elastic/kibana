import React from 'react';

import {
  KuiHeaderBar,
  KuiHeaderBarSection
} from '../../../../components';

export default () => {
  return (
    <div className="kuiView">
      {/* Constrained width, centered content */}
      <div className="kuiViewContent kuiViewContent--constrainedWidth">
        <div className="kuiViewContentItem">
          <KuiHeaderBar className="kuiVerticalRhythm">
            <KuiHeaderBarSection>
              <h2 className="kuiSubTitle">
                Elysium stork
              </h2>
            </KuiHeaderBarSection>

            <KuiHeaderBarSection>
              <span className="kuiText">
                <span className="kuiStatusText kuiStatusText--error">
                  <span className="kuiStatusText__icon kuiIcon fa-warning" />
                  Rope Hoth
                </span>
              </span>
            </KuiHeaderBarSection>
          </KuiHeaderBar>

          {/* Table */}
          <div className="kuiControlledTable kuiVerticalRhythm">
            {/* ToolBar */}
            <div className="kuiToolBar">
              <div className="kuiToolBarSearch">
                <div className="kuiToolBarSearchBox">
                  <div className="kuiToolBarSearchBox__icon kuiIcon fa-search" />
                  <input
                    className="kuiToolBarSearchBox__input"
                    type="text"
                    placeholder="Search..."
                  />
                </div>
              </div>

              <div className="kuiToolBarSection">
                <button className="kuiButton kuiButton--primary">
                  Add
                </button>

                <button className="kuiButton kuiButton--basic kuiButton--icon">
                  <span className="kuiButton__icon kuiIcon fa-gear" />
                </button>

                <button className="kuiButton kuiButton--basic kuiButton--icon">
                  <span className="kuiButton__icon kuiIcon fa-bars" />
                </button>
              </div>

              <div className="kuiToolBarSection">
                <div className="kuiToolBarText">
                  1 &ndash; 20 of 33
                </div>

                <div className="kuiButtonGroup kuiButtonGroup--united">
                  <button className="kuiButton kuiButton--basic kuiButton--icon">
                    <span className="kuiButton__icon kuiIcon fa-chevron-left" />
                  </button>
                  <button className="kuiButton kuiButton--basic kuiButton--icon">
                    <span className="kuiButton__icon kuiIcon fa-chevron-right" />
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <table className="kuiTable">
              <thead>
                <tr>
                  <th scope="col" className="kuiTableHeaderCell kuiTableHeaderCell--checkBox">
                    <input type="checkbox" className="kuiCheckBox"/>
                  </th>
                  <th scope="col" className="kuiTableHeaderCell">
                    Title
                  </th>
                  <th scope="col" className="kuiTableHeaderCell">
                    Status
                  </th>
                  <th scope="col" className="kuiTableHeaderCell">
                    Date created
                  </th>
                  <th scope="col" className="kuiTableHeaderCell kuiTableHeaderCell--alignRight">
                    Orders of magnitude
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr className="kuiTableRow">
                  <td className="kuiTableRowCell kuiTableRowCell--checkBox">
                    <div className="kuiTableRowCell__liner">
                      <input type="checkbox" className="kuiCheckBox"/>
                    </div>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiTableRowCell__liner">
                      <a className="kuiLink" href="#">Alligator</a>
                    </div>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiTableRowCell__liner">
                      <div className="kuiIcon kuiIcon--success fa-check" />
                    </div>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiTableRowCell__liner">
                      Tue Dec 06 2016 12:56:15 GMT-0800 (PST)
                    </div>
                  </td>
                  <td className="kuiTableRowCell kuiTableRowCell--alignRight">
                    <div className="kuiTableRowCell__liner">
                      1
                    </div>
                  </td>
                </tr>

                <tr className="kuiTableRow">
                  <td className="kuiTableRowCell kuiTableRowCell--checkBox">
                    <div className="kuiTableRowCell__liner">
                      <input type="checkbox" className="kuiCheckBox"/>
                    </div>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiTableRowCell__liner">
                      <a className="kuiLink" href="#">Boomerang</a>
                    </div>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiTableRowCell__liner">
                      <div className="kuiIcon kuiIcon--success fa-check" />
                    </div>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiTableRowCell__liner">
                      Tue Dec 06 2016 12:56:15 GMT-0800 (PST)
                    </div>
                  </td>
                  <td className="kuiTableRowCell kuiTableRowCell--alignRight">
                    <div className="kuiTableRowCell__liner">
                      10
                    </div>
                  </td>
                </tr>

                <tr className="kuiTableRow">
                  <td className="kuiTableRowCell kuiTableRowCell--checkBox">
                    <div className="kuiTableRowCell__liner">
                      <input type="checkbox" className="kuiCheckBox"/>
                    </div>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiTableRowCell__liner">
                      <a className="kuiLink" href="#">Celebration</a>
                    </div>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiTableRowCell__liner">
                      <div className="kuiIcon kuiIcon--warning fa-bolt" />
                    </div>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiTableRowCell__liner">
                      Tue Dec 06 2016 12:56:15 GMT-0800 (PST)
                    </div>
                  </td>
                  <td className="kuiTableRowCell kuiTableRowCell--alignRight">
                    <div className="kuiTableRowCell__liner">
                      100
                    </div>
                  </td>
                </tr>

                <tr className="kuiTableRow">
                  <td className="kuiTableRowCell kuiTableRowCell--checkBox">
                    <div className="kuiTableRowCell__liner">
                      <input type="checkbox" className="kuiCheckBox"/>
                    </div>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiTableRowCell__liner">
                      <a className="kuiLink" href="#">Dog</a>
                    </div>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiTableRowCell__liner">
                      <div className="kuiIcon kuiIcon--error fa-warning" />
                    </div>
                  </td>
                  <td className="kuiTableRowCell">
                    <div className="kuiTableRowCell__liner">
                      Tue Dec 06 2016 12:56:15 GMT-0800 (PST)
                    </div>
                  </td>
                  <td className="kuiTableRowCell kuiTableRowCell--alignRight">
                    <div className="kuiTableRowCell__liner">
                      1000
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ToolBarFooter */}
            <div className="kuiToolBarFooter">
              <div className="kuiToolBarFooterSection">
                <div className="kuiToolBarText">
                  5 Items selected
                </div>
              </div>

              <div className="kuiToolBarFooterSection">
                <div className="kuiToolBarText">
                  1 &ndash; 20 of 33
                </div>

                <div className="kuiButtonGroup kuiButtonGroup--united">
                  <button className="kuiButton kuiButton--basic kuiButton--icon">
                    <span className="kuiButton__icon kuiIcon fa-chevron-left" />
                  </button>
                  <button className="kuiButton kuiButton--basic kuiButton--icon">
                    <span className="kuiButton__icon kuiIcon fa-chevron-right" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
