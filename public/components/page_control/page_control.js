import React from 'react';
import { connect } from 'react-redux';
import classnames from 'classnames';
import { workpadPagePrevious, workpadPageNext } from 'plugins/rework/state/actions';
import Centered from 'plugins/rework/components/centered/centered.js';


import './page_control.less';

const PageControl = React.createClass({
  previousPage() {
    const { dispatch } = this.props;
    dispatch(workpadPagePrevious());
  },
  nextPage() {
    const { dispatch } = this.props;
    dispatch(workpadPageNext());
  },
  render() {
    const { direction } = this.props;

    if (direction !== 'next' && direction !== 'previous') {
      throw 'directions must be "next" or "previous"';
    }

    const iconClass = classnames({
      'fa-chevron-circle-left': direction === 'previous',
      'fa-chevron-circle-right': direction === 'next',
      'fa': true
    });

    const handler = direction === 'next' ? this.nextPage : this.previousPage;

    return (
        <a className="rework--page-control" onClick={handler}>
            <i className={iconClass}></i>
        </a>
    );
  }
});

function mapStateToProps(state) {
  return {
    page: state.transient.editor
  };
}

export default connect(mapStateToProps)(PageControl);
