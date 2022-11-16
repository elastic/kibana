import { Component, RefObject, FunctionComponent } from 'react';
import ReactDOM from "react-dom";
import type { Map as MbMap } from '@kbn/mapbox-gl';
// @ts-expect-error
import mapboxDrawStyles from '@mapbox/mapbox-gl-draw/src/lib/theme';
// @ts-expect-error
import DrawRectangle from 'mapbox-gl-draw-rectangle-mode';
// @ts-expect-error
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Feature } from 'geojson';
import { IControl } from 'maplibre-gl';
import React from 'react';
import { EuiButtonIcon, EuiPanel, EuiPopover, EuiText } from '@elastic/eui';
import _ from 'lodash';
const mbDrawModes = MapboxDraw.modes;
const DRAW_RECTANGLE = 'draw_rectangle';
mbDrawModes[DRAW_RECTANGLE] = DrawRectangle;
export interface Props {
    onFilterCreate: (geojson:Feature) => void;
    mbMap: MbMap;
  }

  interface State {
    drawMode: string|undefined;
    x: number;
    y: number;
  }
export class DrawFilter extends Component<Props, State> {
    private _mbDrawControl = new MapboxDraw({
        displayControlsDefault: false,
        modes: mbDrawModes,
        styles: [...mapboxDrawStyles/*, DRAW_CIRCLE_RADIUS_LABEL_STYLE*/],
      });
    controls: MBMapButton[] = [];
    private _mapRemoved: boolean = true;
    private readonly _popoverRef: RefObject<EuiPopover> = React.createRef();
    state: State = {
        drawMode: undefined,
        x: 0,
        y: 0,
    };

    _onMapRemoved(){
        this._mapRemoved = true;
    }
    componentDidMount() {
        this._mapRemoved = false
        this.props.mbMap.on('remove', this._onMapRemoved);
        this.props.mbMap.addControl(this._mbDrawControl);
        this.props.mbMap.on('draw.create', this._onDraw);
        const {  DRAW_POLYGON   } = this._mbDrawControl.modes;
        let controlTypes = [{mode:DRAW_POLYGON,icon:DrawPolygonIcon},{mode:DRAW_RECTANGLE,icon:DrawRectIcon},]
        controlTypes.forEach(c=>{
            let control = new MBMapButton({
                icon:c.icon,
                title:c.mode,
                onClick:()=>{
                    let features = this._mbDrawControl.getAll()
                    features.features = []
                    this._mbDrawControl.set(features)
                    this._mbDrawControl.changeMode(c.mode);
                    this.setState({drawMode:c.mode})
                }
            })
            this.controls.push(control)
        })

        this.controls.forEach(c=>{
            this.props.mbMap.addControl(c)
        })
        this.props.mbMap.on('mousemove', this._updateTooltipLocation);
    }
    componentDidUpdate() {
        if (this._popoverRef.current) {
          this._popoverRef.current.positionPopoverFluid();
        }
      }
      componentWillUnmount() {
        this.props.mbMap.off('draw.create', this._onDraw);
        this.props.mbMap.off('mousemove', this._updateTooltipLocation);
        if(this._mapRemoved){
            this.props.mbMap.removeControl(this._mbDrawControl);
        }

        this.controls.forEach(c=>{
            return this.props.mbMap.removeControl(c);
        })
        this.controls = []

      }
      _onDraw = (event: { features: Feature[] }) => {
        if(event.features.length === 1){
            this.props.onFilterCreate(event.features[0]);
            this.setState({drawMode:undefined})
        }
      };
      _updateTooltipLocation = _.throttle(({ lngLat }) => {
        const mouseLocation = this.props.mbMap.project(lngLat);
        this.setState({
          x: mouseLocation.x+15,
          y: mouseLocation.y - 200, //TODO get the size of the map contianer instead of just hardcode
        });
      }, 100);
      render(){
        const tooltipAnchor = (
            <div style={{ height: '26px', width: '26px', background: 'transparent' }} />
          );

          if(this.state.drawMode){
            console.log(this.state)
            const {  DRAW_POLYGON   } = this._mbDrawControl.modes;
              let instructions = "";
              if(this.state.drawMode === DRAW_RECTANGLE){
                  instructions = 'Click to start rectangle. Move mouse to adjust rectangle size. Click again to finish.'
              }
              if(this.state.drawMode === DRAW_POLYGON){
                  instructions = 'Click to start shape. Click to add vertex. Double click to finish.'
              }
            return (<EuiPopover
            id="drawInstructionsTooltip"
            button={tooltipAnchor}
            anchorPosition="rightCenter"
            isOpen={this.state.drawMode !== undefined}
            closePopover={()=>{}}
            ref={this._popoverRef}
            style={{
              pointerEvents: 'none',
              transform: `translate(${this.state.x - 13}px, ${this.state.y - 13}px)`,
            }}
          >
            <EuiText color="subdued" size="xs" style={{pointerEvents:'none'}}>
              {instructions}
            </EuiText>
          </EuiPopover>)
          }
          return null
      }
}


// Control implemented as ES6 class
class MBMapButton implements IControl {
    private _container: HTMLDivElement ;
    //private _map: MbMap;
    constructor(options:{onClick:()=>void,icon:any,title:string}){
        this._container = document.createElement('div');
        this._container.className = 'mapboxgl-ctrl';
        ReactDOM.render(<EuiPanel paddingSize="none" className="mapToolbarOverlay__button">
        <EuiButtonIcon size="s" iconType={options.icon} onClick={options.onClick} title={options.title} />
        </EuiPanel>, this._container);
    }
    onAdd(map:MbMap) {
    //this._map = map;
    return this._container;
    }
     
    onRemove() {
        if(this._container?.parentNode){
        this._container.parentNode.removeChild(this._container);
        //this._map = undefined;
        }
    }
}


export const DrawPolygonIcon: FunctionComponent = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="49"
    height="25"
    fill="none"
    viewBox="0 0 49 25"
    className="mapLayersWizardIcon"
  >
    <path
      className="mapLayersWizardIcon__background"
      d="M12.281 3l-6.625 7.625 1.657 8.938 35.218-.813v-13l-10.625-3.5-9.781 9.5L12.281 3z"
    />
    <path
      className="mapLayersWizardIcon__highlight"
      fillRule="evenodd"
      d="M31.775 1.68l11.256 3.708v13.85l-36.133.834-1.777-9.593 7.114-8.189 9.875 8.778 9.665-9.388zm.262 1.14l-9.897 9.612-9.813-8.722-6.135 7.06 1.535 8.283 34.304-.792V6.111L32.037 2.82z"
      clipRule="evenodd"
    />
    <circle cx="7.281" cy="19.5" r="2.5" className="mapLayersWizardIcon__highlight" />
    <circle cx="5.656" cy="10.25" r="2.5" className="mapLayersWizardIcon__highlight" />
    <circle cx="12.156" cy="3.625" r="2.5" className="mapLayersWizardIcon__highlight" />
    <circle cx="22" cy="11.6" r="2.5" className="mapLayersWizardIcon__highlight" />
    <circle cx="31.969" cy="2.5" r="2.5" className="mapLayersWizardIcon__highlight" />
    <circle cx="42.344" cy="6.125" r="2.5" className="mapLayersWizardIcon__highlight" />
    <circle cx="42.344" cy="19" r="2.5" className="mapLayersWizardIcon__highlight" />
  </svg>
);

export const DrawRectIcon: FunctionComponent = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="49"
      height="25"
      fill="none"
      viewBox="0 0 49 25"
      className="mapLayersWizardIcon"
    >

      <rect x="10" y="0" width="25" height="25" style={{strokeWidth:1,stroke:"rgb(0,0,0)"}} />

      <circle cx="10" cy="0" r="2.5" className="mapLayersWizardIcon__highlight" />
      <circle cx="10" cy="25" r="2.5" className="mapLayersWizardIcon__highlight" />
      <circle cx="35" cy="25" r="2.5" className="mapLayersWizardIcon__highlight" />
      <circle cx="35" cy="0" r="2.5" className="mapLayersWizardIcon__highlight" />

    </svg>
  );


  