import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { EuiFieldSearch, EuiContextMenuItem, EuiPopoverTitle } from '@elastic/eui';
import lowerCase from 'lodash.lowercase';
import { map, includes, sortBy } from 'lodash';

export const ElementTypes = ({ elements, onClick, search, setSearch }) => {
  search = lowerCase(search);
  elements = sortBy(map(elements, (element, name) => ({ name, ...element })), 'displayName');
  const elementList = map(elements, (element, name) => {
    const { help, displayName, expression, filter, width, height } = element;
    const whenClicked = () => onClick({ expression, filter, width, height });

    // Add back in icon={image} to this when Design has a full icon set
    const card = (
      <EuiContextMenuItem
        key={name}
        toolTipContent={help}
        toolTipPosition="right"
        onClick={whenClicked}
      >
        {displayName}
      </EuiContextMenuItem>
    );

    if (!search) return card;
    if (includes(lowerCase(name), search)) return card;
    if (includes(lowerCase(displayName), search)) return card;
    if (includes(lowerCase(help), search)) return card;
    return null;
  });

  return (
    <Fragment>
      <EuiPopoverTitle>
        <EuiFieldSearch
          compressed
          placeholder="Filter Elements"
          onChange={e => setSearch(e.target.value)}
          value={search}
        />
      </EuiPopoverTitle>
      {elementList}
    </Fragment>
  );
};

ElementTypes.propTypes = {
  elements: PropTypes.object,
  onClick: PropTypes.func,
  search: PropTypes.string,
  setSearch: PropTypes.func,
};
