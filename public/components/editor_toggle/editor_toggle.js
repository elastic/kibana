import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import classnames from 'classnames';
import { editorToggle } from 'plugins/rework/state/actions';
import './editor_toggle.less';

const EditorToggle = React.createClass({
  editorToggle() {
    const { dispatch } = this.props;
    dispatch(editorToggle());
  },
  render() {
    const iconClass = classnames({
      'fa-chevron-left': this.props.editor,
      'fa-chevron-right': !this.props.editor,
      'fa': true
    });
    return (
        <a className="rework--editor-toggle" onClick={this.editorToggle}>
          <div>
            <i className={iconClass}></i>
          </div>
        </a>
    );
  }
});

function mapStateToProps(state) {
  return {
    editor: state.transient.editor
  };
}

export default connect(mapStateToProps)(EditorToggle);
