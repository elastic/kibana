import _ from 'lodash';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Select from 'react-select';

export class TooltipOptions extends Component {

  state = {
    isCollapsed: true
  }

  handleToggleCollapse = () => {
    this.setState(prevState => (
      {  isCollapsed: !prevState.isCollapsed }
    ));
  }

  findVisualizations = async (input) => {
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
      const resp = await this.props.savedObjectsClient.find(findOptions);
      const optionsFromPage = resp.savedObjects
      .filter((savedObject) => {
        if (this.props.isSameSavedObject(savedObject.id)) {
          return false;
        }
        const typeName = JSON.parse(savedObject.attributes.visState).type;
        const visType = this.props.visTypes.byName[typeName];
        if (visType && visType.isEmbeddableInTooltip) {
          return true;
        }
        return false;
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
  }

  setTooltipParam = (paramName, paramValue) => {
    const tooltip = _.cloneDeep(this.props.params.tooltip);
    tooltip[paramName] = paramValue;
    this.props.setParam('tooltip', tooltip);
  }

  handleShowTooltipChange = (evt) => {
    this.props.setParam('addTooltip', evt.target.checked);
  }

  handleTypeChange = (evt) => {
    this.setTooltipParam('type', evt.target.value);
  }

  handleVisChange = (evt) => {
    this.setTooltipParam('vis', evt.value);
  }

  handleHeightChange = (evt) => {
    this.setTooltipParam('height', parseFloat(evt.target.value));
  }

  handleWidthChange = (evt) => {
    this.setTooltipParam('width', parseFloat(evt.target.value));
  }

  renderTooltipType = () => {
    return (
      <div className="kuiSideBarFormRow">
        <label className="kuiSideBarFormRow__label" htmlFor="tooltipType">
          Tooltip
        </label>
        <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
          <select
            id="tooltipType"
            className="kuiSelect"
            value={this.props.params.tooltip.type}
            onChange={this.handleTypeChange}
            data-test-subj="tooltipTypeSelect"
          >
            <option value="metric">Metric</option>
            <option value="vis" data-test-subj="visTooltipOption">Visualization</option>
          </select>
        </div>
      </div>
    );
  }

  renderTooltipHeight = () => {
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
            value={this.props.params.tooltip.height}
            onChange={this.handleHeightChange}
          />
        </div>
      </div>
    );
  }

  renderTooltipWidth = () => {
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
            value={this.props.params.tooltip.width}
            onChange={this.handleWidthChange}
          />
        </div>
      </div>
    );
  }

  renderVisSelect = () => {
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
            value={this.props.params.tooltip.vis}
            loadOptions={this.findVisualizations}
            onChange={this.handleVisChange}
            resetValue={''}
            inputProps={{ id: visSelectId }}
          />
        </div>
      </div>
    );
  }

  renderShowtooltip = () => {
    return (
      <div className="kuiSideBarFormRow">
        <label className="kuiSideBarFormRow__label" htmlFor="showTooltip">
          Show Tooltip
        </label>
        <div className="kuiSideBarFormRow__control">
          <input
            className="kuiCheckBox"
            id="showTooltip"
            type="checkbox"
            checked={this.props.params.addTooltip}
            onChange={this.handleShowTooltipChange}
          />
        </div>
      </div>
    );
  }

  render() {
    const collapseToggleClasses = classNames('kuiIcon', 'kuiSideBarCollapsibleTitle__caret', {
      'fa-caret-right': this.state.isCollapsed,
      'fa-caret-down': !this.state.isCollapsed
    });

    let showTooltip = null;
    let tooltipType = null;
    let visSelect = null;
    let tooltipWidth = null;
    let tooltipHeight = null;
    if (!this.state.isCollapsed) {
      showTooltip = this.renderShowtooltip();
      if (this.props.params.addTooltip && this.props.params.tooltip) {
        tooltipType = this.renderTooltipType();
        if (this.props.params.tooltip.type === 'vis') {
          visSelect = this.renderVisSelect();
        }
        if (this.props.params.tooltip.type !== 'metric') {
          tooltipWidth = this.renderTooltipWidth();
          tooltipHeight = this.renderTooltipHeight();
        }
      }
    }

    return (
      <div>

        <div className="kuiSideBarCollapsibleTitle">
          <div
            className="kuiSideBarCollapsibleTitle__label"
            aria-expanded={!this.isCollapsed}
            aria-controls="tooltipSettings"
            aria-label="Toggle tooltip settings visibility"
            data-test-subj="tooltipSettingsVisibilityToogle"
            onClick={this.handleToggleCollapse}
          >
            <span
              aria-hidden="true"
              className={collapseToggleClasses}
            />
            <span className="kuiSideBarCollapsibleTitle__text">
              Tooltip Settings
            </span>
          </div>
        </div>

        <div id="tooltipSettings" className="kuiSideBarCollapsibleSection">
          <div className="kuiSideBarSection">

            {showTooltip}

            {tooltipType}

            {visSelect}

            {tooltipWidth}

            {tooltipHeight}

          </div>
        </div>
      </div>
    );
  }
}

TooltipOptions.propTypes = {
  isSameSavedObject: PropTypes.func.isRequired,
  params: PropTypes.object.isRequired,
  savedObjectsClient: PropTypes.object.isRequired,
  setParam: PropTypes.func.isRequired,
  visTypes: PropTypes.object.isRequired
};
