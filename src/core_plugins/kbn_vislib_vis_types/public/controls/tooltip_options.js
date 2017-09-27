import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import Select from 'react-select';

export function TooltipOptions(props) {

  const findVisualizations = (input, callback) => {
    props.savedObjectsClient.find({
      type: ['visualization'],
      fields: ['title'],
      search: `${input}*`,
      search_fields: ['title^3', 'description'],
      perPage: 100
    })
    .then((resp) => {
      const options = resp.savedObjects.map((savedObject) => {
        return {
          label: savedObject.attributes.title,
          value: savedObject.id
        };
      });
      callback(null, { options: options });
    });
  };

  const setTooltipParam = (paramName, paramValue) => {
    const tooltip = _.cloneDeep(props.params.tooltip);
    tooltip[paramName] = paramValue;
    props.setParam('tooltip', tooltip);
  };

  const handleShowTooltipChange = (evt) => {
    props.setParam('addTooltip', evt.target.checked);
  };

  const handleTypeChange = (evt) => {
    setTooltipParam('type', evt.target.value);
  };

  const handleVisChange = (evt) => {
    setTooltipParam('vis', evt.value);
  };

  const handleHeightChange = (evt) => {
    setTooltipParam('height', parseFloat(evt.target.value));
  };

  const handleWidthChange = (evt) => {
    setTooltipParam('width', parseFloat(evt.target.value));
  };

  const renderTooltipType = () => {
    return (
      <div className="kuiSideBarFormRow">
        <label className="kuiSideBarFormRow__label" htmlFor="tooltipType">
          Tooltip
        </label>
        <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
          <select
            id="tooltipType"
            className="kuiSelect"
            value={props.params.tooltip.type}
            onChange={handleTypeChange}
          >
            <option value="metric">Metric</option>
            <option value="vis">Visualization</option>
          </select>
        </div>
      </div>
    );
  };

  const renderTooltipHeight = () => {
    return (
      <div className="kuiSideBarFormRow">
        <label className="kuiSideBarFormRow__label" htmlFor="tooltipHeight">
          Height
        </label>
        <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
          <input
            id="tooltipHeight"
            className="kuiTextInput"
            type="number"
            min="100"
            max={window.innerHeight}
            value={props.params.tooltip.height}
            onChange={handleHeightChange}
          />
        </div>
      </div>
    );
  };

  const renderTooltipWidth = () => {
    return (
      <div className="kuiSideBarFormRow">
        <label className="kuiSideBarFormRow__label" htmlFor="tooltipWidth">
          Width
        </label>
        <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
          <input
            id="tooltipWidth"
            className="kuiTextInput"
            type="number"
            min="100"
            max={window.innerWidth}
            value={props.params.tooltip.width}
            onChange={handleWidthChange}
          />
        </div>
      </div>
    );
  };

  const renderVisSelect = () => {
    const visSelectId = 'tooltipVisualization';
    return (
      <div className="kuiSideBarFormRow">
        <label className="kuiSideBarFormRow__label" htmlFor={visSelectId}>
          Visualization
        </label>
        <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
          <Select.Async
            className="vis-react-select"
            placeholder="Select..."
            value={props.params.tooltip.vis}
            loadOptions={findVisualizations}
            onChange={handleVisChange}
            resetValue={''}
            inputProps={{ id: visSelectId }}
          />
        </div>
      </div>
    );
  };

  let tooltipType = null;
  let visSelect = null;
  let tooltipWidth = null;
  let tooltipHeight = null;
  if (props.params.addTooltip && props.params.tooltip) {
    tooltipType = renderTooltipType();
    if (props.params.tooltip.type === 'vis') {
      visSelect = renderVisSelect();
    }
    if (props.params.tooltip.type !== 'metric') {
      tooltipWidth = renderTooltipWidth();
      tooltipHeight = renderTooltipHeight();
    }
  }

  return (
    <div>

      <div className="kuiSideBarFormRow">
        <label className="kuiSideBarFormRow__label" htmlFor="showTooltip">
          Show Tooltip
        </label>
        <div className="kuiSideBarFormRow__control">
          <input
            className="kuiCheckBox"
            id="showTooltip"
            type="checkbox"
            checked={props.params.addTooltip}
            onChange={handleShowTooltipChange}
          />
        </div>
      </div>

      {tooltipType}

      {visSelect}

      {tooltipWidth}

      {tooltipHeight}

    </div>
  );
}

TooltipOptions.propTypes = {
  params: PropTypes.object.isRequired,
  savedObjectsClient: PropTypes.object.isRequired,
  setParam: PropTypes.func.isRequired
};
