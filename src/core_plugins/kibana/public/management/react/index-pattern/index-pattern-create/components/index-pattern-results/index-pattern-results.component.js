import React from 'react';
import {
  KuiTitle,
  KuiIcon,
  KuiFlexGroup,
  KuiFlexItem,
  KuiText,
  KuiSelect,
  KuiTable,
  KuiTableRow,
  KuiTableRowCell,
  KuiTableHeaderCell,
  KuiTableBody,
  KuiTableHeader,
  KuiButtonEmpty,
  KuiHorizontalRule,
  KuiPagination,
} from 'ui_framework/components';

const IndexPatternResults = ({
  indices,
  numOfPages,
  perPage,
  page,
  sortBy,
  sortAsc,
  changeSort,
  goToPage,
  changePerPage,
}) => {
  if (indices === undefined) {
    return null;
  }

  // console.log('IndexPatternResults');
  // console.log('indices', indices);
  // console.log('numOfPages', numOfPages);
  // console.log('perPage', perPage);
  // console.log('page', page);
  // console.log('sortBy', sortBy);
  // console.log('sortAsc', sortAsc);
  // console.log('======');

  const indexRows = indices.map((index, key) => {
    return (
      <KuiTableRow key={key}>
        <KuiTableRowCell>
          {index.name}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {index.count}
        </KuiTableRowCell>
      </KuiTableRow>
    );
  });

  return (
    <KuiFlexItem>
      <KuiTitle>
        <h3>...that will match these indices</h3>
      </KuiTitle>
      <KuiTable className="kuiVerticalRhythm">
        <KuiTableHeader>
          <KuiTableHeaderCell>
            <KuiButtonEmpty
              onClick={() => changeSort('name')}
            >
              Name
              { sortBy === 'name'
                ?
                  <span>
                    &nbsp;
                    <KuiIcon
                      type={sortAsc ? 'arrowUp' : 'arrowDown'}
                      size="medium"
                    />
                  </span>
                : null
              }
            </KuiButtonEmpty>
          </KuiTableHeaderCell>
          <KuiTableHeaderCell>
            <KuiButtonEmpty
              onClick={() => changeSort('count')}
            >
              Doc Count
              { sortBy === 'count'
                ?
                  <span>
                    &nbsp;
                    <KuiIcon
                      type={sortAsc ? 'arrowUp' : 'arrowDown'}
                      size="medium"
                    />
                  </span>
                : null
              }
            </KuiButtonEmpty>
          </KuiTableHeaderCell>
        </KuiTableHeader>
        <KuiTableBody>
          {indexRows}
        </KuiTableBody>
      </KuiTable>
      <KuiHorizontalRule />
      <KuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <KuiFlexItem grow={false}>
          <KuiText size="small">
            Rows per page:
          </KuiText>
          <KuiSelect
            value={perPage}
            onChange={(e) => changePerPage(e.target.value)}
            options={[
              { value: 1, text: 1 },
              { value: 10, text: 10 },
              { value: 20, text: 20 },
              { value: 50, text: 50 },
            ]}
          />
        </KuiFlexItem>
        {numOfPages > 1
          ?
            <KuiFlexItem grow={false}>
              <KuiPagination
                pageCount={numOfPages}
                activePage={page}
                onPageClick={goToPage}
              />
            </KuiFlexItem>
          : null
        }
      </KuiFlexGroup>
    </KuiFlexItem>
  );
};

export default IndexPatternResults;
