import React from 'react';
import PropTypes from 'prop-types';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import 'react-datetime/css/react-datetime.css';

export const DatetimeQuickList = ({ from, to, ranges, onSelect, children }) => (
  <div style={{ display: 'grid', alignItems: 'center' }}>
    {ranges.map(
      (range, i) =>
        from === range.from && to === range.to ? (
          <EuiButton size="s" fill key={i} onClick={() => onSelect(range.from, range.to)}>
            {range.display}
          </EuiButton>
        ) : (
          <EuiButtonEmpty size="s" key={i} onClick={() => onSelect(range.from, range.to)}>
            {range.display}
          </EuiButtonEmpty>
        )
    )}
    {children}
  </div>
);

DatetimeQuickList.propTypes = {
  from: PropTypes.string,
  to: PropTypes.string,
  ranges: PropTypes.array,
  onSelect: PropTypes.func,
  children: PropTypes.node,
};
