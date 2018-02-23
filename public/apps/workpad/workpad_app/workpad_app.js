import React from 'react';
import PropTypes from 'prop-types';
import { Sidebar } from '../../../components/sidebar';
import { Toolbar } from '../../../components/toolbar';
import { Workpad } from '../../../components/workpad';
import { WorkpadHeader } from '../../../components/workpad_header';
import './workpad_app.less';

export class WorkpadApp extends React.PureComponent {
  static propTypes = {
    editing: PropTypes.bool,
    deselectElement: PropTypes.func,
    initializeWorkpad: PropTypes.func.isRequired,
  };

  componentDidMount() {
    this.props.initializeWorkpad();
  }

  render() {
    const { editing, deselectElement } = this.props;

    return (
      <div className="canvas__workpad_app">
        <div className="canvas__workpad_app--main">
          <div className="canvas__workpad_app--workpad" onMouseDown={deselectElement}>
            <WorkpadHeader />
            <div className="canvas__workpad_app--workspace">
              <Workpad />
            </div>
          </div>
          {editing && (
            <div className="canvas__workpad_app--sidebar">
              <Sidebar />
            </div>
          )}
        </div>

        {editing ? <Toolbar /> : null}
      </div>
    );
  }
}
