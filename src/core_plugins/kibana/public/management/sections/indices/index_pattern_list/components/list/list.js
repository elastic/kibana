import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiButtonEmpty,
  EuiBadge,
} from '@elastic/eui';

export class List extends Component {
  static propTypes = {
    indexPatterns: PropTypes.array,
  }

  render() {
    const { indexPatterns } = this.props;
    return (
      <div>
        {
          indexPatterns.map(pattern => {
            return (
              <div key={pattern.id} >
                <EuiButtonEmpty size="s" href={pattern.url}>
                  {pattern.default ? <Fragment><i aria-label="Default index pattern" className="fa fa-star" /> </Fragment> : ''}
                  {pattern.active ? <strong>{pattern.title}</strong> : pattern.title} {pattern.tag ? (
                    <Fragment key={pattern.tag.key}>
                      {<EuiBadge color={pattern.tag.color || 'primary'}>{pattern.tag.name}</EuiBadge> }
                    </Fragment>
                  ) : null}
                </EuiButtonEmpty>
              </div>
            );
          })
        }
      </div>
    );
  }
}
