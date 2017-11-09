import classNames from 'classnames';
import React from 'react';
import PropTypes from 'prop-types';
import { Parameter } from './parameter';

export class ParameterForm extends React.Component {

  state = {
    isFormVisible: false
  }

  handleToggleVisibility = () => {
    this.setState(prevState => (
      {  isFormVisible: !prevState.isFormVisible }
    ));
  }

  renderInputs = () => {
    return this.props.params.map(param => (
      <Parameter
        key={param.id}
        id={param.id}
        label={param.label}
        value={this.props.paramValues[param.id]}
        setParameter={this.props.setParameter}
      />
    ));
  }

  render() {
    const visibilityToggleClasses = classNames('kuiIcon kuiSideBarCollapsibleTitle__caret', {
      'fa-caret-right': !this.state.isFormVisible,
      'fa-caret-down': this.state.isFormVisible
    });

    let form;
    if (this.state.isFormVisible) {
      form = (
        <div className="kuiSideBarSection">
          {this.renderInputs()}
        </div>
      );
    }
    return (
      <div>

        <div className="kuiSideBarCollapsibleTitle" style={{ cursor: 'pointer' }}>
          <div
            aria-label="toggle command parameters visibility"
            className="kuiSideBarCollapsibleTitle__label"
            onClick={this.handleToggleVisibility}
          >
            <span className={visibilityToggleClasses} />
            <span className="kuiSideBarCollapsibleTitle__text">
              Command parameters
            </span>
          </div>
        </div>

        {form}

      </div>
    );
  }
}

ParameterForm.propTypes = {
  params: PropTypes.array.isRequired,
  paramValues: PropTypes.object.isRequired,
  setParameter: PropTypes.func.isRequired
};
