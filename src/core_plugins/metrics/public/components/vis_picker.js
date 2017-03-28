import React, { PropTypes } from 'react';

function VisPickerItem(props) {
  const { label, icon, type } = props;
  let itemClassName = 'vis_editor__vis_picker-item';
  let iconClassName = 'vis_editor__vis_picker-icon';
  let labelClassName = 'vis_editor__vis_picker-label';
  if (props.selected) {
    itemClassName += ' selected';
    iconClassName += ' selected';
    labelClassName += ' selected';
  }
  return (
    <div className={itemClassName} onClick={() => props.onClick(type)}>
      <div className={iconClassName}>
        <i className={`fa ${icon}`}></i>
      </div>
      <div className={labelClassName}>
        { label }
      </div>
    </div>
  );
}

VisPickerItem.propTypes = {
  icon: PropTypes.string,
  label: PropTypes.string,
  onClick: PropTypes.func,
  type: PropTypes.string,
  selected: PropTypes.bool
};

function VisPicker(props) {
  const handleChange = (type) => {
    props.onChange({ type });
  };

  const { model } = props;
  const icons = [
    { type: 'timeseries', icon: 'fa-line-chart', label: 'Time Series' },
    { type: 'metric', icon: 'fa-superscript', label: 'Metric' },
    { type: 'top_n', icon: 'fa-bar-chart fa-rotate-90', label: 'Top N' },
    { type: 'gauge', icon: 'fa-circle-o-notch', label: 'Gauge' },
    { type: 'markdown', icon: 'fa-paragraph', label: 'Markdown' }
  ].map(item => {
    return (
      <VisPickerItem
        key={item.type}
        onClick={handleChange}
        selected={ item.type === model.type }
        {...item}/>
    );
  });

  return (
    <div className="vis_editor__vis_picker-container">
      { icons }
    </div>
  );

}

VisPicker.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func
};

export default VisPicker;
