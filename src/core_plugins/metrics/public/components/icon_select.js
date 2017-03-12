import React, { Component, PropTypes } from 'react';
import Select from 'react-select';

class IconOption extends Component {

  constructor(props) {
    super(props);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
  }

  handleMouseDown(event) {
    event.preventDefault();
    event.stopPropagation();
    this.props.onSelect(this.props.option, event);
  }

  handleMouseEnter(event) {
    this.props.onFocus(this.props.option, event);
  }

  handleMouseMove(event) {
    if (this.props.isFocused) return;
    this.props.onFocus(this.props.option, event);
  }

  render() {
    const icon = this.props.option.value;
    const title = this.props.option.label;
    return (
      <div className={this.props.className}
        onMouseEnter={this.handleMouseEnter}
        onMouseDown={this.handleMouseDown}
        onMouseMove={this.handleMouseMove}
        title={title}>
        <span className="Select-value-label">
          <i className={`vis_editor__icon_select-option fa ${icon}`}></i>
          { this.props.children }
        </span>
      </div>
    );
  }

}

IconOption.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  isDisabled: PropTypes.bool,
  isFocused: PropTypes.bool,
  isSelected: PropTypes.bool,
  onFocus: PropTypes.func,
  onSelect: PropTypes.func,
  option: PropTypes.object.isRequired,
};


function IconValue(props) {
  const icon = props.value && props.value.value;
  const label = props.value && props.value.label;
  return (
    <div className="Select-value" title={label}>
      <span className="Select-value-label">
        <i className={`vis_editor__icon_select-value fa ${icon}`}></i>
        { props.children }
      </span>
    </div>
  );
}

IconValue.propTypes = {
  children: PropTypes.node,
  placeholder: PropTypes.string,
  value: PropTypes.object.isRequired
};

function IconSelect(props) {
  return (
    <Select
      clearable={false}
      onChange={props.onChange}
      value={props.value}
      optionComponent={IconOption}
      valueComponent={IconValue}
      options={props.icons} />
  );
}

IconSelect.defaultProps = {
  icons: [
    { value: 'fa-asterisk', label: 'Asterisk' },
    { value: 'fa-bell', label: 'Bell' },
    { value: 'fa-bolt', label: 'Bolt' },
    { value: 'fa-bomb', label: 'Bomb' },
    { value: 'fa-bug', label: 'Bug' },
    { value: 'fa-comment', label: 'Comment' },
    { value: 'fa-exclamation-circle', label: 'Exclamation Circle' },
    { value: 'fa-exclamation-triangle', label: 'Exclamation Triangle' },
    { value: 'fa-fire', label: 'Fire' },
    { value: 'fa-flag', label: 'Flag' },
    { value: 'fa-heart', label: 'Heart' },
    { value: 'fa-map-marker', label: 'Map Marker' },
    { value: 'fa-map-pin', label: 'Map Pin' },
    { value: 'fa-star', label: 'Star' },
    { value: 'fa-tag', label: 'Tag' },
  ]
};

IconSelect.propTypes = {
  icons: PropTypes.array,
  onChange: PropTypes.func,
  value: PropTypes.string.isRequired
};

export default IconSelect;
