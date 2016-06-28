/*jshint esnext:true*/

let { x, y, ...z } = { x: 1, y: 2, a: 3, b: 4 };
let n = { x, y, ...z };

// Array comprehensions
var results = [
  for(c of customers)
    if (c.city == "Seattle")
      { name: c.name, age: c.age }
]

// Generator comprehensions
var results = (
  for(c of customers)
    if (c.city == "Seattle")
      { name: c.name, age: c.age }
)
