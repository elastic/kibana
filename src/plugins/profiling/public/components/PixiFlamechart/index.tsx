import React, { useCallback, useContext, useEffect, useRef, useState } from "react";

import { DrawBlockWithUI, FlameGraph } from "./FlameGraph";
import { DrawableBlock } from "./FlameGraph/helpers/flamechartDataContainer";
import { PerBlockEstimates } from "./FlameGraph/helpers/getEstimatesForBlock";
import { TooltipPosition } from "./FlameGraph/components/GraphTooltip";

import { FlameGraphContext } from '../contexts/flamegraph';

import css from "./index.module.scss";

export interface PixiFlamechartProps {
  projectID: string;
}

export const PixiFlamechart: React.FC<PixiFlamechartProps> = ({ projectID }) => {
  const ctx = useContext(FlameGraphContext);

  const [, setBlockInfo] = useState<DrawableBlock | null>(null);
  const [, setBlockInfoEstimate] = useState<PerBlockEstimates | null>(null);
  const [, setBlockTooltip] = useState<DrawableBlock | null>(null);
  const [, setBlockTooltipPlacement] = useState<TooltipPosition | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout>();

  const onWindowResize = useCallback(() => {
    console.log(new Date().toISOString(), "set up window resize timeout");
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {}, 250);
  }, []);

  /**
   * we need to use `useCallback` to avoid re-rendering the pixi component whenever
   * the state changes which would generate a new function pointer
   */
  const setBlockDataToShow = useCallback(
    (block: DrawableBlock | null, estimates: PerBlockEstimates | null) => {
      console.log(new Date().toISOString(), "set block data to show");
      setBlockInfo(block);
      setBlockInfoEstimate(estimates);
    },
    [setBlockInfo, setBlockInfoEstimate]
  );

  const setBlockTooltipToShow = useCallback(
    (block: DrawableBlock | null, placement: TooltipPosition | null) => {
      setBlockTooltip(block);
      setBlockTooltipPlacement(placement);
    },
    [setBlockTooltip, setBlockTooltipPlacement]
  );

  useEffect(() => {
    console.log(new Date().toISOString(), "add window resize event listener");
    window.addEventListener("resize", onWindowResize);
    return () => window.removeEventListener("resize", onWindowResize);
  }, [onWindowResize]);

  /**
   * A function that will get triggered once the user presses a flamegraphBlock
   * The goal here is to get the block information (xCoordinate, yCoordinate and LayerNumber)
   * To be able to create a shareable URL of the block pressed
   *
   * @param clickedBlock pressed Flamegraph block which is an Object
   */
  const setClickedBlockInfo = (clickedBlock: DrawBlockWithUI) => {
    const { Rectangle } = clickedBlock;
    const { xCoordinate, yCoordinate, LayerNumber } = Rectangle;
    console.log(new Date().toISOString(), `set clicked block information to x=${xCoordinate} y=${yCoordinate} layer=${LayerNumber}`);
  };

  return (
    <div className={css.host}>
    { ctx && ctx.TotalTraces &&
      <FlameGraph
        projectId={projectID}
        data={ctx}
        showBlockInfo={setBlockDataToShow}
        showBlockTooltip={setBlockTooltipToShow}
        setClickedBlockInfo={setClickedBlockInfo}
      />
    }
    </div>
  );
};
