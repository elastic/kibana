import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import Select from 'react-select';

const visTypeExcludeList = [
  'input_control_vis',
  'tagcloud',
  'tile_map',
  'timelion',
  'region_map',
  'metrics' // TSVB
];

export function TooltipOptions(props) {

  const findVisualizations = async (input) => {
    const findOptions = {
      type: ['visualization'],
      fields: ['title', 'visState'],
      search: `${input}*`,
      search_fields: ['title^3', 'description'],
      page: 1,
      perPage: 100
    };

    let options = [];
    let fetchNextPage = false;

    do {
      const resp = await props.savedObjectsClient.find(findOptions);
      const optionsFromPage = resp.savedObjects
      .filter((savedObject) => {
        const visType = JSON.parse(savedObject.attributes.visState).type;
        if (visTypeExcludeList.includes(visType)) {
          return false;
        }
        return true;
      })
      .map((savedObject) => {
        return {
          label: savedObject.attributes.title,
          value: savedObject.id
        };
      });
      options = options.concat(optionsFromPage);

      fetchNextPage = false;
      if (resp.savedObjects.length === findOptions.perPage && options.length < findOptions.perPage / 5) {
        // More than 4/5ths of returned visualizations got filtered out!
        // Fetch next page to provide a fuller list
        fetchNextPage = true;
        findOptions.page += 1;
      }
    } while (fetchNextPage && findOptions.page <= 10);

    return { options: options };
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
            data-test-subj="tooltipTypeSelect"
          >
            <option value="metric">Metric</option>
            <option value="vis" data-test-subj="visTooltipOption">Visualization</option>
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
