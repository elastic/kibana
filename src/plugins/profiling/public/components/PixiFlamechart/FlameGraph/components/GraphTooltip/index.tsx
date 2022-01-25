import { FC } from "react";

import css from "./graph-tooltip.mdoule.scss";

export interface TooltipPosition {
  left: number;
  top: number;
}

interface Props {
  children: React.ReactNode;
  placement: TooltipPosition;
}

const BlockTooltip: FC<Props> = ({ children, placement }) => {
  const distanceToMouse = 10;
  let transform = "";
  let left = `${placement.left + distanceToMouse}px`;
  let top = `${placement.top + distanceToMouse}px`;
  let minWidth = "";

  /**
   * ensure tooltip never gets out of the container
   * for code simplicity we use the window width
   * for precision we should be using the container width instead
   */
  if (placement.left > window.innerWidth / 2) {
    transform += " translateX(-100%) ";
    left = `${placement.left - distanceToMouse}px`;
    minWidth = "250px";
  }

  /**
   * ensure tooltip never gets out of the container
   * for code simplicity we use the window width
   * for precision we should be using the container height instead
   */
  if (placement.top > window.innerHeight / 2) {
    transform += " translateY(-100%) ";
    top = `${placement.top - distanceToMouse}px`;
  }

  return (
    <div className={css.host} style={{ left, top, transform, minWidth }}>
      <div className={css.content}>{children}</div>
    </div>
  );
};

export default BlockTooltip;
