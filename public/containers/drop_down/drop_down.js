import React from 'react';
import { connect } from 'react-redux';
import DataframeDialog from 'plugins/rework/containers/dataframe_dialog';
import ElementAddDialog from 'plugins/rework/containers/element_add_dialog';
import './drop_down.less';
import classnames from 'classnames';

const DropDown = React.createClass({
  render() {
    const {dropdown} = this.props;
    const style = {
      display: 'flex',
      position: 'relative',
    };

    const dialog = (() => {
      switch (dropdown) {
        case 'dataframe':
          return (<DataframeDialog></DataframeDialog>);
        case 'element':
          return (<ElementAddDialog></ElementAddDialog>);
        default:
          return null;
      }
    }());

    const content = !dialog ? null : (
      <div className="rework--dropdown" style={style}>
        {dialog}
      </div>
    );

    return (content);
  }
});

function mapStateToProps(state) {
  return {
    dropdown: state.transient.dropdown,
  };
}

export default connect(mapStateToProps)(DropDown);
