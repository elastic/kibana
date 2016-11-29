/**********************************************************
 * Kibana
 **********************************************************/

@water-fill: #D9F3FD;
@water-outline: #8DD3EE;

@land-fill: #F9F5EC;
@land-outline: #B3B3B3;

Map { background-color:@water-fill; }

.water-poly { polygon-fill:@water-fill; }

#land::glow-inner[zoom>=0] {
  line-color:@land-outline;
  line-width:2;
  line-join:round;
  line-opacity:1;
}

#land[zoom>=0] {
  polygon-fill:@land-fill;
  polygon-gamma:0.7;
  line-color:@land-outline;
  line-width: 1;
  line-join:round;
  line-opacity: 0;
}

#international_boundaries[zoom>1] {
  line-color:@land-outline;
  line-width:1;
  line-join:round;
  line-opacity: 0.75;
}

#lakes.water-poly[zoom>=0] {
  line-width: 1;
  polygon-fill:@water-fill;
  line-color: @water-outline;
}

#subnational_boundaries[zoom>3] {
  line-color:@land-outline;
  line-width:1;
  line-join:round;
  line-opacity: 0.25;
}
