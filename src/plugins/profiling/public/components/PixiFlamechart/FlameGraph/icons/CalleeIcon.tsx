import React, { FC } from "react";

interface Props {
  width?: number;
  height?: number;
  className?: string;
}

const CalleeIcon: FC<Props> = ({ width, height, className }) => {
  return (
    <svg
      viewBox="0 0 16 14"
      width={width}
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        transform="translate(0 -1)"
        strokeWidth="1.2"
        fill="none"
        fillRule="evenodd"
      >
        <rect x="1" y="6" width="14" height="4" rx="1" />
        <path
          opacity=".60000002"
          strokeLinecap="round"
          d="M1 14h14M1 2h4M8 2h7"
        />
      </g>
    </svg>
  );
};

export default CalleeIcon;
