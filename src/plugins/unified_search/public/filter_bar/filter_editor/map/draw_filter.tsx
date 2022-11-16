import { Component, RefObject } from 'react';
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
        let controlTypes = [{mode:DRAW_POLYGON,icon:"grid"},{mode:DRAW_RECTANGLE,icon:"grabHorizontal"},]
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