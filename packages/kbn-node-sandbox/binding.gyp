{
  "targets": [ 
    {
      "sources": [ 
        "native/module.cpp",
      ],
      "conditions": [
        ['OS=="linux"', { "sources": [ "native/sandbox_linux.cpp" ], "target_name": "sandbox_linux" }],
        ['OS=="win"', { "sources": [ "native/sandbox_win.cpp" ], "target_name": "sandbox_win32" }],
        ['OS=="mac"', { "sources": [ "native/sandbox_mac.cpp" ], "target_name": "sandbox_mac" }],
      ]
    }
  ]
}
